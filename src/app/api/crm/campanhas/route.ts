import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('crm_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calcular contagens manualmente (Supabase não suporta múltiplas contagens filtradas num select só)
  const campanhas = await Promise.all(
    (data ?? []).map(async (c) => {
      const { count: total } = await supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id);
      const { count: sent } = await supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'sent');
      const { count: replied } = await supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).in('status', ['replied', 'read']);
      const { count: failed } = await supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'failed');
      return { ...c, total_recipients: total ?? 0, sent_count: sent ?? 0, replied_count: replied ?? 0, failed_count: failed ?? 0 };
    }),
  );

  return NextResponse.json({ campanhas });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const {
    name, instance_ids = [], message_pool_ids = [],
    delay_min_ms = 3000, delay_max_ms = 9000,
    daily_limit_per_instance = 150,
    use_ai_rewrite = true, ai_tone = 'casual',
  } = body;

  if (!name) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });

  const { data, error } = await supabase
    .from('crm_campaigns')
    .insert({
      name, instance_ids, message_pool_ids,
      delay_min_ms, delay_max_ms, daily_limit_per_instance,
      use_ai_rewrite, ai_tone,
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campanha: data }, { status: 201 });
}
