// Dispatcher do CRM: seleciona template, reescreve com IA, envia via uazapi, registra resultado.
// Chamado pelo cron /api/crm/dispatcher a cada 5 min (11h–23h UTC).

import { createAdminClient } from '@/lib/supabase/admin';
import { chamarClaude } from '@/lib/claude';
import { enviarWhatsapp } from '@/lib/whatsapp';
import {
  CrmInstance,
  CrmMessagePool,
  CrmRecipient,
  SCORE,
  extractDdd,
  nextSendWindowUTC,
  randomDelay,
  sleep,
  escolherInstancia,
} from '@/lib/crm';

export type DispatchResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

// Reescreve o template com IA para garantir texto único por envio
async function reescreverMensagem(
  body: string,
  nome: string,
  tom: string,
): Promise<string> {
  const result = await chamarClaude({
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 400,
    system: `Você é especialista em marketing conversacional via WhatsApp.
Reescreva a mensagem abaixo de forma ${tom === 'profissional' ? 'profissional e cordial' : tom === 'urgente' ? 'urgente e direta' : 'natural e descontraída'}.
Regras obrigatórias:
- Mantenha TODAS as variáveis {{...}} exatamente como estão
- Mantenha emojis se houver, mas pode trocar por equivalentes
- Nunca use travessão (—)
- Máximo de 3 parágrafos curtos
- Soe como uma pessoa real escrevendo agora, não um robô
- Não adicione saudações genéricas que não estavam no original`,
    messages: [
      {
        role: 'user',
        content: `Nome do destinatário: ${nome}\n\nMensagem original:\n${body}`,
      },
    ],
  });

  return result.ok ? result.text.trim() : body;
}

// Substitui variáveis básicas no template
function resolverVariaveis(body: string, recipient: Partial<CrmRecipient>): string {
  return body
    .replace(/\{\{nome\}\}/gi, recipient.name ?? '')
    .replace(/\{\{empresa\}\}/gi, recipient.empresa ?? '')
    .replace(/\{\{bairro\}\}/gi, recipient.bairro ?? '')
    .replace(/\{\{ddd\}\}/gi, recipient.ddd ?? '');
}

// Sorteia aleatoriamente um template do pool
function sortearTemplate(pool: CrmMessagePool[]): CrmMessagePool | null {
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Processa um batch de recipients prontos para envio
export async function processarBatch(batchSize = 15): Promise<DispatchResult> {
  const result: DispatchResult = { processed: 0, sent: 0, failed: 0, skipped: 0 };
  const supabase = createAdminClient();
  if (!supabase) return result;

  const now = new Date();

  // Buscar recipients pendentes cuja janela de envio chegou
  const { data: recipients } = await supabase
    .from('crm_recipients')
    .select('*, crm_campaigns!inner(id, status, message_pool_ids, use_ai_rewrite, ai_tone, delay_min_ms, delay_max_ms, instance_ids, daily_limit_per_instance)')
    .eq('status', 'pending')
    .lte('send_after', now.toISOString())
    .in('crm_campaigns.status', ['queued', 'sending'])
    .order('send_after', { ascending: true })
    .limit(batchSize);

  if (!recipients?.length) return result;

  // Buscar todas as instâncias necessárias
  const allInstanceIds = [...new Set(recipients.flatMap((r: any) => r.crm_campaigns?.instance_ids ?? []))];
  const { data: instanciasRaw } = await supabase
    .from('crm_instances')
    .select('id, name, token, subdomain, status, sent_today, daily_limit')
    .in('id', allInstanceIds);
  const instancias = (instanciasRaw ?? []) as Pick<CrmInstance, 'id' | 'sent_today' | 'daily_limit' | 'status'>[];

  // Buscar pools de mensagens necessários
  const allPoolIds = [...new Set(recipients.flatMap((r: any) => r.crm_campaigns?.message_pool_ids ?? []))];
  const { data: poolRaw } = await supabase
    .from('crm_message_pool')
    .select('*')
    .in('id', allPoolIds)
    .eq('ativo', true);
  const pool = (poolRaw ?? []) as CrmMessagePool[];

  for (const recipient of recipients as any[]) {
    result.processed++;
    const campaign = recipient.crm_campaigns;
    if (!campaign || campaign.status === 'paused') {
      result.skipped++;
      continue;
    }

    // Escolher instância disponível
    const campInstancias = instancias.filter((i) => campaign.instance_ids.includes(i.id));
    const instanceId = escolherInstancia(campInstancias);
    if (!instanceId) {
      // Todas as instâncias atingiram o limite diário — adiar para amanhã
      const ddd = recipient.ddd ?? extractDdd(recipient.phone) ?? '11';
      const tomorrow8h = nextSendWindowUTC(ddd, new Date(now.getTime() + 20 * 3_600_000));
      await supabase.from('crm_recipients').update({ send_after: tomorrow8h.toISOString() }).eq('id', recipient.id);
      result.skipped++;
      continue;
    }

    // Buscar token da instância escolhida
    const { data: instFull } = await supabase
      .from('crm_instances')
      .select('token, subdomain')
      .eq('id', instanceId)
      .single();

    // Sortear e preparar mensagem
    const campPool = pool.filter((p) => campaign.message_pool_ids.includes(p.id));
    const template = sortearTemplate(campPool);
    if (!template) {
      result.skipped++;
      continue;
    }

    let texto = resolverVariaveis(template.body, recipient);
    if (campaign.use_ai_rewrite && template.use_ai_rewrite) {
      texto = await reescreverMensagem(texto, recipient.name ?? 'você', campaign.ai_tone ?? 'casual');
    }

    // Enviar via instância específica da campanha
    let envioOk = false;
    let envioErro: string | undefined;
    try {
      const uazUrl = instFull?.subdomain
        ? `https://${instFull.subdomain}.uazapi.com`
        : process.env.UAZAPI_URL ?? '';
      const uazToken = instFull?.token ?? process.env.UAZAPI_TOKEN ?? '';

      const res = await fetch(`${uazUrl.replace(/\/$/, '')}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', token: uazToken },
        body: JSON.stringify({ number: recipient.phone, text: texto }),
      });
      envioOk = res.ok;
      if (!res.ok) envioErro = `uazapi ${res.status}`;
    } catch (e) {
      envioErro = String((e as Error)?.message ?? e);
    }

    const now2 = new Date();

    if (envioOk) {
      result.sent++;
      // Atualizar recipient
      await supabase.from('crm_recipients').update({
        status: 'sent',
        instance_id: instanceId,
        message_sent: texto,
        sent_at: now2.toISOString(),
        tags: [...(recipient.tags ?? []), 'enviado'],
      }).eq('id', recipient.id);

      // Atualizar ou criar lead global
      await supabase.from('crm_leads').upsert({
        phone: recipient.phone,
        name: recipient.name,
        ddd: recipient.ddd,
        bairro: recipient.bairro,
        state: recipient.state,
        score: SCORE.entregue,
        total_received: 1,
        last_campaign_at: now2.toISOString(),
      }, {
        onConflict: 'phone',
        ignoreDuplicates: false,
      });
      // Incrementar score e total_received no lead existente
      await supabase.rpc('crm_lead_increment', {
        p_phone: recipient.phone,
        p_score_delta: SCORE.entregue,
        p_received_delta: 1,
        p_name: recipient.name ?? null,
        p_ddd: recipient.ddd ?? null,
        p_bairro: recipient.bairro ?? null,
        p_state: recipient.state ?? null,
        p_campaign_at: now2.toISOString(),
      }).maybeSingle();

      // Incrementar sent_today da instância (na lista em memória também)
      await supabase.from('crm_instances').update({ sent_today: instancias.find(i => i.id === instanceId)!.sent_today + 1 }).eq('id', instanceId);
      const inst = instancias.find((i) => i.id === instanceId);
      if (inst) inst.sent_today++;
    } else {
      result.failed++;
      await supabase.from('crm_recipients').update({
        status: 'failed',
        tags: [...(recipient.tags ?? []), 'falhou'],
      }).eq('id', recipient.id);
    }

    // Marcar campanha como "sending" se ainda estava "queued"
    if (campaign.status === 'queued') {
      await supabase.from('crm_campaigns').update({ status: 'sending', started_at: now2.toISOString() }).eq('id', campaign.id);
    }

    // Delay aleatório entre envios
    const delay = randomDelay(campaign.delay_min_ms, campaign.delay_max_ms);
    await sleep(delay);
  }

  // Verificar campanhas concluídas (todos recipients não-pending)
  const campaignIds = [...new Set((recipients as any[]).map((r: any) => r.campaign_id))];
  for (const cid of campaignIds) {
    const { count } = await supabase
      .from('crm_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', cid)
      .eq('status', 'pending');
    if (count === 0) {
      await supabase.from('crm_campaigns').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', cid);
    }
  }

  return result;
}
