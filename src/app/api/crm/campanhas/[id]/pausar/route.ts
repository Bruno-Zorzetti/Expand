import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: camp } = await supabase.from('crm_campaigns').select('status').eq('id', id).single();
  if (!camp) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

  const novoStatus = camp.status === 'paused' ? 'queued' : 'paused';
  const update: Record<string, unknown> = { status: novoStatus };
  if (novoStatus === 'paused') update.paused_at = new Date().toISOString();

  await supabase.from('crm_campaigns').update(update).eq('id', id);
  return NextResponse.json({ status: novoStatus });
}
