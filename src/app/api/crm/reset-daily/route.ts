import { NextResponse } from 'next/server';
import { createAdminClient as createClient } from '@/lib/supabase/admin';

// Cron: 0 11 * * * (11h UTC = 8h Brasília — início do dia útil)
// Reseta sent_today de todas as instâncias para começar o novo dia de envios
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: 'DB indisponível' }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from('crm_instances')
    .update({ sent_today: 0, last_reset_at: today })
    .lt('last_reset_at', today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, reset_at: today });
}
