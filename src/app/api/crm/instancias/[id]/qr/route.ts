import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient as adminClient } from '@/lib/supabase/admin';

// GET — retorna QR code base64 da instância para exibir no modal
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: inst } = await supabase
    .from('crm_instances')
    .select('token, subdomain, status')
    .eq('id', id)
    .single();

  if (!inst) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

  if (inst.status === 'connected') {
    return NextResponse.json({ connected: true });
  }

  const uazUrl = `https://${inst.subdomain}.uazapi.com`;

  // Iniciar processo de conexão se necessário
  await fetch(`${uazUrl}/instance/connect`, {
    method: 'POST',
    headers: { token: inst.token },
  }).catch(() => {});

  // Buscar QR code
  const res = await fetch(`${uazUrl}/instance/qrcode`, {
    headers: { token: inst.token },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return NextResponse.json({ error: `uazapi ${res.status}` }, { status: 502 });

  const data = await res.json();
  const qr = data?.qrcode ?? data?.qr ?? data?.base64 ?? null;

  // Atualizar status para 'connecting'
  const supa = adminClient();
  if (supa && inst.status === 'disconnected') {
    await supa.from('crm_instances').update({ status: 'connecting' }).eq('id', id);
  }

  return NextResponse.json({ qr, connected: false });
}
