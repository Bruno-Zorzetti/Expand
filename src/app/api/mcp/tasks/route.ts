import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MCP_KEY = process.env.MCP_API_KEY;

function authorized(req: NextRequest): boolean {
  if (!MCP_KEY) return true; // dev sem key: permite tudo
  return req.headers.get("authorization") === `Bearer ${MCP_KEY}`;
}

type Body = { action: string } & Record<string, unknown>;

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: Body = await req.json();
  const { action } = body;

  const sb = createAdminClient();
  if (!sb) return NextResponse.json({ error: "Admin client indisponível (verifique SUPABASE_SERVICE_ROLE_KEY)" }, { status: 500 });

  const hoje = new Date().toISOString().slice(0, 10);

  try {
    // ── list_tasks ────────────────────────────────────────────────
    if (action === "list_tasks") {
      let q = sb.from("expand_etapas")
        .select("id,titulo,cliente_id,area,responsavel,responsavel_atual,status,sla,data_prevista,marco,bloqueado,criado_em")
        .order("criado_em", { ascending: false });
      if (body.status)      q = q.eq("status",     body.status as string);
      if (body.cliente_id)  q = q.eq("cliente_id", body.cliente_id as string);
      if (body.area)        q = q.eq("area",        body.area as string);
      if (body.responsavel) q = q.or(`responsavel.ilike.%${body.responsavel}%,responsavel_atual.ilike.%${body.responsavel}%`);
      q = q.limit(typeof body.limit === "number" ? body.limit : 30);
      const { data, error } = await q;
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    // ── get_task ──────────────────────────────────────────────────
    if (action === "get_task") {
      const { data, error } = await sb.from("expand_etapas")
        .select("*").eq("id", body.id as string).single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    // ── create_task ───────────────────────────────────────────────
    if (action === "create_task") {
      const cliId = body.cliente_id as string;
      const { data: max } = await sb.from("expand_etapas")
        .select("ordem,fase").eq("cliente_id", cliId)
        .order("ordem", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await sb.from("expand_etapas").insert({
        titulo:            body.titulo as string,
        cliente_id:        cliId,
        area:              (body.area as string | null) ?? null,
        responsavel:       (body.responsavel as string | null) ?? null,
        responsavel_atual: (body.responsavel as string | null) ?? null,
        sla:               (body.sla as string | null) ?? null,
        data_prevista:     (body.data_prevista as string | null) ?? null,
        criterio:          (body.criterio as string | null) ?? null,
        status:            "idle",
        fase:              (max?.fase as number | null) ?? 1,
        ordem:             ((max?.ordem as number | null) ?? 0) + 1,
        marco:             false,
        bloqueado:         false,
        visivel_cliente:   false,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    // ── start_task ────────────────────────────────────────────────
    if (action === "start_task") {
      const { error } = await sb.from("expand_etapas")
        .update({ status: "run", iniciada_em: new Date().toISOString() })
        .eq("id", body.id as string);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: `Tarefa ${body.id} iniciada.` });
    }

    // ── complete_task ─────────────────────────────────────────────
    if (action === "complete_task") {
      const { data: t } = await sb.from("expand_etapas")
        .select("iniciada_em").eq("id", body.id as string).single();
      const duracao = t?.iniciada_em
        ? Math.round((Date.now() - new Date(t.iniciada_em as string).getTime()) / 60000) : null;
      const { error } = await sb.from("expand_etapas").update({
        status: "done",
        concluida_em: new Date().toISOString(),
        duracao_min: duracao,
      }).eq("id", body.id as string);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: `Concluída. Duração: ${duracao ?? "—"} min.` });
    }

    // ── assign_task ───────────────────────────────────────────────
    if (action === "assign_task") {
      const { error } = await sb.from("expand_etapas")
        .update({ responsavel_atual: body.responsavel as string })
        .eq("id", body.id as string);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: `Atribuída para ${body.responsavel}.` });
    }

    // ── dashboard ─────────────────────────────────────────────────
    if (action === "dashboard") {
      const { data } = await sb.from("expand_etapas")
        .select("id,status,cliente_id,data_prevista,bloqueado");
      const counts = { total: 0, idle: 0, run: 0, wait: 0, done: 0, late: 0 };
      const cliLate = new Map<string, number>();
      for (const e of data ?? []) {
        counts.total++;
        (counts as Record<string, number>)[e.status] = ((counts as Record<string, number>)[e.status] ?? 0) + 1;
        if (e.bloqueado || (e.status === "idle" && e.data_prevista && e.data_prevista < hoje)) {
          counts.late++;
          cliLate.set(e.cliente_id, (cliLate.get(e.cliente_id) ?? 0) + 1);
        }
      }
      return NextResponse.json({
        ok: true,
        data: { counts, top_clientes_atrasados: [...cliLate.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) },
      });
    }

    // ── list_clients ──────────────────────────────────────────────
    if (action === "list_clients") {
      const { data, error } = await sb.from("expand_clientes").select("id,nome").order("nome");
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ error: `Action desconhecida: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
