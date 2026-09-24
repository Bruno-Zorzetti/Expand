import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const [{ data: campanha }, { data: recipients }] = await Promise.all([
    supabase.from('crm_campaigns').select('*').eq('id', id).single(),
    supabase.from('crm_recipients').select('id, name, phone, type, ddd, status, tags, sent_at, last_replied_at').eq('campaign_id', id).order('sent_at', { ascending: false }),
  ]);

  if (!campanha) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
  return NextResponse.json({ campanha, recipients: recipients ?? [] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase.from('crm_campaigns').update(body).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campanha: data });
}
