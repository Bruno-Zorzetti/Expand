import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient as adminClient } from '@/lib/supabase/admin';

// GET — lista instâncias com status live via uazapi
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('crm_instances')
    .select('*')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Atualiza status live de cada instância em paralelo
  const instancias = await Promise.all(
    (data ?? []).map(async (inst) => {
      try {
        const url = `https://${inst.subdomain}.uazapi.com`;
        const res = await fetch(`${url}/instance/status`, {
          headers: { token: inst.token },
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const json = await res.json();
          const status = json?.state ?? json?.status ?? inst.status;
          const phone = json?.phone ?? json?.number ?? inst.phone;
          // Persistir status atualizado
          const supa = adminClient();
          if (supa) await supa.from('crm_instances').update({ status, phone }).eq('id', inst.id);
          return { ...inst, status, phone };
        }
      } catch { /* timeout ou offline */ }
      return inst;
    }),
  );

  return NextResponse.json({ instancias });
}

// POST — criar nova instância (requer admintoken)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { name, subdomain, daily_limit = 200 } = await req.json();
  if (!name || !subdomain) return NextResponse.json({ error: 'name e subdomain são obrigatórios' }, { status: 400 });

  const adminToken = process.env.UAZAPI_ADMIN_TOKEN;
  if (!adminToken) return NextResponse.json({ error: 'UAZAPI_ADMIN_TOKEN não configurado' }, { status: 500 });

  // Criar instância no uazapi
  const uazUrl = `https://${subdomain}.uazapi.com`;
  const uazRes = await fetch(`${uazUrl}/instance/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', admintoken: adminToken },
    body: JSON.stringify({ name }),
  });

  if (!uazRes.ok) {
    const txt = await uazRes.text();
    return NextResponse.json({ error: `uazapi: ${txt}` }, { status: 502 });
  }

  const uazData = await uazRes.json();
  const token = uazData?.token ?? uazData?.instance?.token;
  if (!token) return NextResponse.json({ error: 'Token não retornado pelo uazapi' }, { status: 502 });

  const supa = adminClient();
  if (!supa) return NextResponse.json({ error: 'Admin client indisponível' }, { status: 500 });

  const { data, error } = await supa
    .from('crm_instances')
    .insert({ name, token, subdomain, daily_limit, status: 'disconnected' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instancia: data }, { status: 201 });
}
