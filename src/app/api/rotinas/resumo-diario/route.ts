import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processarResumoCliente } from "@/lib/resumo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rotina diária: lê os grupos, resume e propõe demandas ao PMO.
// Protegida por CRON_SECRET (Vercel Cron envia Authorization: Bearer <CRON_SECRET>).
// Roda sem usuário — usa a service role do Supabase (SUPABASE_SERVICE_ROLE_KEY).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    return NextResponse.json({ skipped: true, motivo: "defina SUPABASE_SERVICE_ROLE_KEY no Vercel para o modo automático (o botão 'Rodar resumo agora' já funciona manualmente)" });
  }
  const sb = createClient(url, svc, { auth: { persistSession: false } });

  const { data: rot } = await sb.from("expand_rotina").select("ativa").eq("chave", "resumo-diario").maybeSingle();
  if (rot && rot.ativa === false) return NextResponse.json({ skipped: true, motivo: "rotina pausada" });

  const { data: cls } = await sb.from("expand_clientes").select("id, nome, whatsapp_grupo").eq("ativo", true).not("whatsapp_grupo", "is", null);
  const clientes = (cls ?? []) as { id: string; nome: string; whatsapp_grupo: string | null }[];

  let tin = 0, tout = 0, custo = 0;
  const res = [] as { cliente: string; ok: boolean; demandas: number; erro?: string }[];
  for (const c of clientes) {
    const r = await processarResumoCliente(sb, c);
    tin += r.tokensIn; tout += r.tokensOut; custo += r.custo;
    res.push({ cliente: r.cliente, ok: r.ok, demandas: r.demandas, erro: r.erro });
  }
  const { data: rr } = await sb.from("expand_rotina").select("tokens_total, custo_total").eq("chave", "resumo-diario").maybeSingle();
  await sb.from("expand_rotina").update({ ultima_exec: new Date().toISOString(), proxima_exec: new Date(Date.now() + 864e5).toISOString(), tokens_total: Number(rr?.tokens_total ?? 0) + tin + tout, custo_total: Number(rr?.custo_total ?? 0) + custo }).eq("chave", "resumo-diario");

  return NextResponse.json({ ok: true, clientes: clientes.length, tokens: tin + tout, custo, res });
}
