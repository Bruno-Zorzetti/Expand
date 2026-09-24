import { NextResponse } from 'next/server';
import { processarBatch } from '@/lib/crm-dispatcher';

export const maxDuration = 55;

// Chamado pelo Vercel Cron: */5 11-23 * * *
// Cobre janela 8h–19h para todos os fusos brasileiros (UTC-5 a UTC-3)
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const result = await processarBatch(15);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
