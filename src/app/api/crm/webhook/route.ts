import { NextResponse } from 'next/server';
import { createAdminClient as createClient } from '@/lib/supabase/admin';
import { SCORE } from '@/lib/crm';

// POST — recebe eventos uazapi e atualiza score + tags dos leads
// Configurar na instância uazapi apontando para: https://seudominio.com/api/crm/webhook
// Header obrigatório: x-webhook-secret = CRM_WEBHOOK_SECRET
export async function POST(req: Request) {
  const secret = process.env.CRM_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get('x-webhook-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }

  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: 'DB indisponível' }, { status: 500 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const event = body?.event ?? body?.type ?? body?.messageType;
  const data  = body?.data ?? body;

  // Extrair telefone do remetente
  const from: string = (
    data?.key?.remoteJid ??
    data?.from ??
    data?.sender ??
    ''
  ).replace(/[@:].*/g, '').replace(/\D/g, '');

  if (!from || from.length < 10) return NextResponse.json({ ok: true });

  // Ignorar mensagens enviadas por nós (fromMe)
  if (data?.key?.fromMe === true) return NextResponse.json({ ok: true });

  const now = new Date().toISOString();

  // ── Mensagem recebida do lead ────────────────────────────────────────────────
  if (event === 'messages.upsert' || event === 'message' || !event) {
    const isGroup = from.includes('@g.us') || data?.key?.remoteJid?.includes('@g.us');
    if (isGroup) return NextResponse.json({ ok: true }); // ignorar grupos por ora

    // Verificar quantas respostas anteriores o lead já deu
    const { data: lead } = await supabase
      .from('crm_leads')
      .select('score, total_replied, tags, blocked')
      .eq('phone', from)
      .single();

    if (lead?.blocked) return NextResponse.json({ ok: true });

    const totalReplied = (lead?.total_replied ?? 0) + 1;
    let scoreDelta: number;
    if (totalReplied === 1)      scoreDelta = SCORE.respondeu1;
    else if (totalReplied === 2) scoreDelta = SCORE.respondeu2;
    else                         scoreDelta = SCORE.respondeu3;

    const novasTags = [...new Set([...(lead?.tags ?? []), 'respondeu'])];

    await supabase.from('crm_leads').upsert({
      phone: from,
      score: (lead?.score ?? 0) + scoreDelta,
      total_replied: totalReplied,
      tags: novasTags,
      last_reply_at: now,
    }, { onConflict: 'phone' });

    // Atualizar último recipient encontrado
    await supabase.from('crm_recipients')
      .update({ status: 'replied', last_replied_at: now, tags: novasTags })
      .eq('phone', from)
      .in('status', ['sent', 'read'])
      .order('sent_at', { ascending: false })
      .limit(1);
  }

  // ── ACK de leitura ───────────────────────────────────────────────────────────
  if (event === 'message.update' || event === 'messages.update') {
    const ack: number = data?.update?.message?.status ?? data?.ack ?? 0;
    if (ack >= 3) {
      const { data: lead } = await supabase.from('crm_leads').select('score, tags').eq('phone', from).single();
      if (lead && !lead.tags?.includes('lido')) {
        await supabase.from('crm_leads').update({
          score: (lead.score ?? 0) + SCORE.lido,
          tags: [...(lead.tags ?? []), 'lido'],
        }).eq('phone', from);

        await supabase.from('crm_recipients')
          .update({ status: 'read' })
          .eq('phone', from)
          .eq('status', 'sent');
      }
    }
  }

  // ── Contato bloqueou ─────────────────────────────────────────────────────────
  if (event === 'contacts.update' || (data?.action === 'blocked')) {
    await supabase.from('crm_leads').upsert({
      phone: from,
      blocked: true,
      score: -30,
      tags: ['bloqueou'],
    }, { onConflict: 'phone' });
  }

  return NextResponse.json({ ok: true });
}
