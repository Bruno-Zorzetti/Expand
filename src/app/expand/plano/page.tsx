import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import { type AcaoFull, type Membro, type ClienteSimples, PlanoAcaoClient } from "./PlanoClient";

export const dynamic = "force-dynamic";

export default async function PlanoAcao() {
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();

  const [{ data }, { data: ps }, { data: clis }] = await Promise.all([
    supabase
      .from("expand_plano_acao")
      .select("id, titulo, detalhe, responsaveis, data_limite, data_inicio, hora, status, origem, prioridade, concluida_em, cliente_id")
      .order("data_limite", { nullsFirst: false }),
    supabase
      .from("expand_perfis")
      .select("id, nome, cor, cargo")
      .eq("tipo", "humano")
      .order("nome"),
    supabase
      .from("expand_clientes")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome"),
  ]);

  const acoes = (data ?? []) as AcaoFull[];

  const membros: Membro[] = (ps ?? []).map((p) => ({
    id:    p.id as string,
    nome:  p.nome as string,
    cor:   (p.cor as string) ?? "var(--accent)",
    ini:   (p.nome as string).slice(0, 2).toUpperCase(),
    cargo: (p.cargo as string | null) ?? null,
  }));

  const clientes: ClienteSimples[] = (clis ?? []).map((c) => ({
    id:   c.id as string,
    nome: c.nome as string,
  }));

  const feitas    = acoes.filter((a) => a.status === "done").length;
  const atrasadas = acoes.filter((a) => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return a.status !== "done" && a.data_limite && new Date(a.data_limite + "T12:00") < hoje;
  }).length;
  const envolvidos = new Set(acoes.flatMap((a) => a.responsaveis ?? [])).size;
  const urgentes   = acoes.filter((a) => a.prioridade === "urgente" && a.status !== "done").length;

  return (
    <>
      <p className="hx-eyebrow">Gestão · reunião de líderes</p>
      <h1 className="ex-h1">Plano de <span className="hx-accent-text">ação</span></h1>
      <p className="ex-sub">Ações do Grupo Expand com responsável, prioridade e data limite. Marque como concluída ao entregar.</p>

      <div className="ex-kpis" style={{ marginBottom: 20 }}>
        <div className="ex-kpi hx-glass">
          <div className="lab">Ações</div>
          <div className="val">{acoes.length}</div>
          <div className="foot">no plano</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Concluídas</div>
          <div className="val" style={{ color: "var(--green)" }}>{feitas}</div>
          <div className="foot">{acoes.length ? Math.round((feitas / acoes.length) * 100) : 0}% do plano</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Em atraso</div>
          <div className="val" style={{ color: atrasadas ? "var(--red)" : "var(--dim)" }}>{atrasadas}</div>
          <div className="foot">passou da data</div>
        </div>
        {urgentes > 0 && (
          <div className="ex-kpi hx-glass">
            <div className="lab">Urgentes</div>
            <div className="val" style={{ color: "#CE6A5F" }}>{urgentes}</div>
            <div className="foot">ação imediata</div>
          </div>
        )}
        <div className="ex-kpi hx-glass">
          <div className="lab">Envolvidos</div>
          <div className="val">{envolvidos}</div>
          <div className="foot">responsáveis</div>
        </div>
      </div>

      <PlanoAcaoClient acoes={acoes} membros={membros} clientes={clientes} isAdmin={isAdmin} />
    </>
  );
}
