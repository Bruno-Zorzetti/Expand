import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient as adminClient } from '@/lib/supabase/admin';
import { extractDdd, dddState, nextSendWindowUTC, escolherInstancia } from '@/lib/crm';

// POST — enfileira todos os recipients, calcula send_after por DDD, muda status para queued
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  // recipients: [{name, phone, empresa?, bairro?, type?}] ou groups: [jid1, jid2]
  const { recipients = [], groups = [] } = body as {
    recipients: { name?: string; phone: string; empresa?: string; bairro?: string }[];
    groups: string[];
  };

  const { data: campaign } = await supabase
    .from('crm_campaigns')
    .select('status, instance_ids')
    .eq('id', id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  if (!['draft', 'paused'].includes(campaign.status)) {
    return NextResponse.json({ error: `Campanha está ${campaign.status}` }, { status: 409 });
  }

  const supa = adminClient();
  if (!supa) return NextResponse.json({ error: 'Admin client indisponível' }, { status: 500 });

  // Buscar instâncias da campanha para distribuir recipients
  const { data: instancias } = await supabase
    .from('crm_instances')
    .select('id, status, sent_today, daily_limit')
    .in('id', campaign.instance_ids);

  const now = new Date();

  // Buscar leads globais para ordenar por score (hot first)
  const allPhones = recipients.map((r) => r.phone.replace(/\D/g, ''));
  const { data: leadsData } = await supabase
    .from('crm_leads')
    .select('phone, score, blocked, last_campaign_at')
    .in('phone', allPhones);

  const leadMap = new Map(leadsData?.map((l) => [l.phone, l]) ?? []);

  // Ordenar: hot leads primeiro, bloqueados por último
  const ordenados = [...recipients].sort((a, b) => {
    const la = leadMap.get(a.phone.replace(/\D/g, ''));
    const lb = leadMap.get(b.phone.replace(/\D/g, ''));
    const sa = la?.score ?? 0;
    const sb = lb?.score ?? 0;
    return sb - sa; // score desc
  });

  // Montar rows de recipients com send_after calculado por DDD
  const rows = ordenados.map((r, idx) => {
    const phone = r.phone.replace(/\D/g, '');
    const ddd = extractDdd(phone);
    const state = ddd ? dddState(ddd) : null;
    const lead = leadMap.get(phone);

    // Pular se bloqueado
    if (lead?.blocked) return null;

    // Calcular send_after: cada recipient tem um offset baseado no delay médio * posição
    const avgDelay = 6000; // ms (meio do range padrão)
    const baseOffset = idx * avgDelay;
    const baseTime = new Date(now.getTime() + baseOffset);
    const sendAfter = ddd ? nextSendWindowUTC(ddd, baseTime) : baseTime;

    const instIdx = idx % Math.max(1, (instancias ?? []).length);
    const instanceId = instancias?.[instIdx]?.id ?? null;

    return {
      campaign_id: id,
      phone,
      name: r.name ?? null,
      empresa: r.empresa ?? null,
      bairro: r.bairro ?? null,
      type: 'individual' as const,
      ddd: ddd ?? null,
      state,
      send_after: sendAfter.toISOString(),
      instance_id: instanceId,
      status: 'pending',
      tags: [],
    };
  }).filter(Boolean);

  // Adicionar grupos WhatsApp
  const groupRows = groups.map((jid, idx) => ({
    campaign_id: id,
    phone: jid,
    type: 'group' as const,
    send_after: now.toISOString(),
    status: 'pending',
    tags: [],
    instance_id: instancias?.[idx % Math.max(1, (instancias ?? []).length)]?.id ?? null,
  }));

  const allRows = [...rows, ...groupRows];
  if (!allRows.length) return NextResponse.json({ error: 'Nenhum destinatário válido' }, { status: 400 });

  // Inserir recipients e atualizar status da campanha
  const { error: insErr } = await supa.from('crm_recipients').insert(allRows.filter(Boolean) as NonNullable<typeof allRows[number]>[]);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await supa.from('crm_campaigns').update({ status: 'queued' }).eq('id', id);

  return NextResponse.json({
    ok: true,
    enfileirados: allRows.length,
    bloqueados: recipients.length - rows.length,
  });
}
