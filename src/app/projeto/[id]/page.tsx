import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { RESP_ICON, RESP_LABEL } from "@/lib/pipelines";
import Icon from "@/components/Icon";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type Etapa = {
  id: string;
  ordem: number;
  nome: string;
  responsavel: string;
  status: string;
  detalhe: string | null;
  updated_at: string;
};

export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projeto/${id}`);

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, product_slug, products(name, cockpit, prazo_dias)")
    .eq("id", id)
    .single();
  if (!order) notFound();
  const prod = Array.isArray(order.products) ? order.products[0] : order.products;

  const { data: brief } = await supabase
    .from("briefings")
    .select("enviado_at")
    .eq("order_id", id)
    .maybeSingle();
  const prazoDias = (prod?.prazo_dias as number | null) ?? null;
  let sla: { iniciado: boolean; restantes?: number; entrega?: string } = { iniciado: false };
  if (brief?.enviado_at && prazoDias) {
    const fim = new Date(brief.enviado_at).getTime() + prazoDias * 86400000;
    sla = {
      iniciado: true,
      restantes: Math.ceil((fim - Date.now()) / 86400000),
      entrega: new Date(fim).toLocaleDateString("pt-BR"),
    };
  }

  const { data: etapasData } = await supabase
    .from("order_etapas")
    .select("id, ordem, nome, responsavel, status, detalhe, updated_at")
    .eq("order_id", id)
    .order("ordem");
  const etapas = (etapasData ?? []) as Etapa[];

  const { data: logsData } = await supabase
    .from("etapa_logs")
    .select("etapa_id, autor, tipo, texto, arquivo_url, created_at")
    .eq("order_id", id)
    .order("created_at");
  const assinar = async (p: string | null): Promise<string | null> => {
    if (!p) return null;
    if (p.startsWith("http")) return p;
    const { data } = await supabase.storage.from("arquivos").createSignedUrl(p, 3600);
    return data?.signedUrl ?? null;
  };
  const logs = await Promise.all(
    (logsData ?? []).map(async (l) => ({ ...l, url: await assinar(l.arquivo_url) })),
  );
  const logsDe = (eid: string) => logs.filter((l) => l.etapa_id === eid);

  const { data: plano } = await supabase
    .from("projeto_plano")
    .select("w2h, squad")
    .eq("order_id", id)
    .maybeSingle();
  const w2h = (plano?.w2h ?? {}) as Record<string, string>;
  const squad = (plano?.squad ?? []) as { nome: string; papel: string }[];
  const temPlano = Object.values(w2h).some((v) => v);
  const W2H_LABEL: [string, string][] = [
    ["oque", "O quê"], ["porque", "Por quê"], ["quem", "Quem"],
    ["onde", "Onde"], ["quando", "Quando"], ["como", "Como"], ["quanto", "Quanto"],
  ];

  const total = etapas.length;
  const feitas = etapas.filter((e) => e.status === "concluido").length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  const atual =
    etapas.find((e) => e.status === "andamento" || e.status === "aprovacao") ??
    etapas.find((e) => e.status === "pendente");
  const aprovacoes = etapas.filter((e) => e.status === "aprovacao" && e.responsavel === "cliente");
  const concluidas = etapas.filter((e) => e.status === "concluido");
  const aFazer = etapas.filter((e) => e.status !== "concluido");
  const briefingEtapa = etapas.find(
    (e) => e.responsavel === "cliente" && e.nome.startsWith("Briefing detalhado") && e.status !== "concluido",
  );

  async function aprovar(formData: FormData) {
    "use server";
    const etapaId = String(formData.get("etapa") ?? "");
    if (!etapaId) return;
    const supabase = await createClient();
    const { data: et } = await supabase
      .from("order_etapas")
      .select("id, order_id, ordem")
      .eq("id", etapaId)
      .single();
    if (!et) return;
    await supabase.from("order_etapas").update({ status: "concluido", updated_at: new Date().toISOString() }).eq("id", etapaId);
    await supabase.from("etapa_logs").insert({
      etapa_id: etapaId,
      order_id: et.order_id,
      autor: "Cliente",
      tipo: "sistema",
      texto: "Aprovado pelo cliente.",
    });
    const { data: prox } = await supabase
      .from("order_etapas")
      .select("id, status")
      .eq("order_id", et.order_id)
      .gt("ordem", et.ordem)
      .order("ordem")
      .limit(1)
      .maybeSingle();
    if (prox && prox.status === "pendente") {
      await supabase.from("order_etapas").update({ status: "andamento" }).eq("id", prox.id);
    }
    revalidatePath(`/projeto/${id}`);
  }

  const size = 220, sw = 16, r = size / 2 - sw;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const noPrazo = pct >= 100 ? "Concluído" : "No prazo";

  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <p className="hx-eyebrow">Acompanhamento do projeto</p>
        <h1 className="mt-1 text-3xl font-extrabold">{prod?.name ?? order.product_slug}</h1>

        {etapas.length === 0 ? (
          <div className="hx-glass mt-8 p-8 text-center text-[var(--mut)]">
            Seu projeto está sendo preparado. Em breve você acompanha cada etapa aqui.
          </div>
        ) : (
          <>
            {/* Aprovação pendente */}
            {aprovacoes.map((e) => (
              <div
                key={e.id}
                className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5"
                style={{
                  borderColor: "color-mix(in srgb, var(--warn) 55%, transparent)",
                  background: "color-mix(in srgb, var(--warn) 12%, var(--panel))",
                  boxShadow: "0 0 46px color-mix(in srgb, var(--warn) 28%, transparent)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-[#2b1405]" style={{ background: "var(--warn)" }}>
                    <Icon name="check" size={18} />
                  </span>
                  <div>
                    <p className="font-bold">Sua aprovação é necessária</p>
                    <p className="text-sm text-[var(--mut)]">{e.nome}{e.detalhe ? ` — ${e.detalhe}` : ""}</p>
                  </div>
                </div>
                <form action={aprovar}>
                  <input type="hidden" name="etapa" value={e.id} />
                  <button className="hx-btn hx-btn-primary">Aprovar e continuar</button>
                </form>
              </div>
            ))}

            {/* Briefing detalhado pendente */}
            {briefingEtapa && (
              <div
                className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)",
                  background: "color-mix(in srgb, var(--accent) 12%, var(--panel))",
                  boxShadow: "0 0 46px color-mix(in srgb, var(--accent) 32%, transparent)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full hx-accent text-white">
                    <Icon name="briefcase" size={18} />
                  </span>
                  <div>
                    <p className="font-bold">Sua vez: preencha o briefing detalhado</p>
                    <p className="text-sm text-[var(--mut)]">É o que dá início ao projeto e ao prazo de entrega.</p>
                  </div>
                </div>
                <Link href={`/projeto/${id}/briefing`} className="hx-btn hx-btn-primary">
                  Preencher briefing
                </Link>
              </div>
            )}

            {/* Hero: a fazer | gauge | concluído */}
            <div className="mt-6 grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
              {/* A fazer */}
              <div className="hx-glass p-5">
                <p className="hx-eyebrow mb-3">A fazer</p>
                <ul className="space-y-2">
                  {aFazer.length === 0 && (
                    <li className="flex items-center gap-2 text-sm text-[var(--green)]">
                      <Icon name="checkCircle" size={16} /> Tudo concluído
                    </li>
                  )}
                  {aFazer.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                      style={
                        e.id === atual?.id
                          ? {
                              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                              boxShadow: "0 0 22px color-mix(in srgb, var(--accent) 22%, transparent)",
                            }
                          : undefined
                      }
                    >
                      <Icon name={RESP_ICON[e.responsavel]} size={16} className="shrink-0" style={{ color: e.id === atual?.id ? "var(--accent)" : "var(--dim)" }} />
                      <span className={e.id === atual?.id ? "font-bold" : "text-[var(--mut)]"}>{e.nome}</span>
                      {e.status === "andamento" && (
                        <span className="ml-auto rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">agora</span>
                      )}
                      {e.status === "aprovacao" && (
                        <span className="ml-auto rounded-full bg-[color-mix(in_srgb,var(--warn)_20%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--warn)]">aprovar</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gauge — texto em camada HTML (sem sobreposição no SVG) */}
              <div className="flex flex-col items-center">
                <div className="relative h-52 w-52">
                  <svg viewBox={`0 0 ${size} ${size}`} className="h-52 w-52">
                    <defs>
                      <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" />
                        <stop offset="100%" stopColor="var(--accent-2)" />
                      </linearGradient>
                    </defs>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
                    <circle
                      cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#pg)" strokeWidth={sw}
                      strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                      style={{ filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 55%, transparent))" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="hx-eyebrow">Progresso</span>
                    <span className="text-5xl font-extrabold leading-none">{pct}%</span>
                    <span className="mt-1.5 text-xs font-bold text-[var(--green)]">{noPrazo}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[var(--dim)]">{feitas} de {total} etapas</p>
              </div>

              {/* Concluído */}
              <div className="hx-glass p-5">
                <p className="hx-eyebrow mb-3">Concluído</p>
                <ul className="space-y-2">
                  {concluidas.length === 0 && <li className="text-sm text-[var(--mut)]">Começando agora.</li>}
                  {concluidas.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-sm">
                      <Icon name="check" size={16} className="shrink-0 text-[var(--green)]" />
                      <span>{e.nome}</span>
                      <span className="ml-auto text-[10px] text-[var(--dim)]">{RESP_LABEL[e.responsavel]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quem está operando */}
            {atual && (
              <div className="hx-glass mt-4 flex items-center gap-3 p-4">
                <Icon name={RESP_ICON[atual.responsavel]} size={22} className="shrink-0 text-[var(--accent)]" />
                <div>
                  <p className="text-sm">
                    Etapa atual: <b>{atual.nome}</b>
                  </p>
                  <p className="text-xs text-[var(--mut)]">
                    Responsável agora: {RESP_LABEL[atual.responsavel]} · atualizado em{" "}
                    {new Date(atual.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {prod?.cockpit === "gmn" && (
                  <Link href={`/diagnostico/${id}`} className="hx-btn hx-btn-ghost ml-auto text-sm">
                    Ver diagnóstico
                  </Link>
                )}
              </div>
            )}

            {/* Plano estratégico (5W2H) + squad */}
            {temPlano && (
              <div className="hx-glass mt-4 p-5">
                <p className="hx-eyebrow mb-3">Plano do projeto</p>
                {squad.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {squad.map((s) => (
                      <span key={s.nome} className="rounded-full bg-[var(--panel-2)] px-3 py-1 text-xs">
                        <b>{s.nome}</b> <span className="text-[var(--mut)]">· {s.papel}</span>
                      </span>
                    ))}
                  </div>
                )}
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {W2H_LABEL.filter(([k]) => w2h[k]).map(([k, label]) => (
                    <div key={k}>
                      <dt className="hx-eyebrow">{label}</dt>
                      <dd className="text-sm text-[var(--txt)]">{w2h[k]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* SLA / prazo */}
            {prazoDias && (
              <div
                className="hx-glass mt-4 border-l-4 p-4"
                style={{
                  borderLeftColor: !sla.iniciado
                    ? "var(--warn)"
                    : (sla.restantes ?? 0) < 0
                      ? "var(--red)"
                      : (sla.restantes ?? 0) <= 3
                        ? "var(--warn)"
                        : "var(--green)",
                }}
              >
                {sla.iniciado ? (
                  <>
                    <p className="text-sm font-bold">
                      {(sla.restantes ?? 0) >= 0
                        ? `${sla.restantes} dia(s) restantes`
                        : `${Math.abs(sla.restantes ?? 0)} dia(s) em atraso`}
                    </p>
                    <p className="text-xs text-[var(--mut)]">
                      Entrega prevista até {sla.entrega} · prazo de {prazoDias} dias
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold">Prazo ainda não iniciado</p>
                    <p className="text-xs text-[var(--mut)]">
                      O prazo de {prazoDias} dias começa a contar quando você enviar o briefing detalhado.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Marco / linha do tempo — cada etapa abre o seu histórico */}
            <h2 className="mt-8 mb-3 text-lg font-bold">Linha do tempo</h2>
            <p className="mb-3 text-xs text-[var(--dim)]">Clique numa etapa para ver o que foi feito e os arquivos entregues.</p>
            <div className="space-y-2">
              {etapas.map((e) => {
                const done = e.status === "concluido";
                const now = e.id === atual?.id;
                const cor = done ? "var(--green)" : now ? "var(--accent)" : "var(--dim)";
                const evs = logsDe(e.id);
                return (
                  <details
                    key={e.id}
                    className="hx-glass p-3"
                    style={now ? {
                      borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)",
                      boxShadow: "0 0 30px color-mix(in srgb, var(--accent) 22%, transparent)",
                    } : undefined}
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: `color-mix(in srgb, ${cor} 18%, transparent)`, color: cor }}>
                        {done ? <Icon name="check" size={14} /> : e.ordem}
                      </span>
                      <span className={now ? "font-bold" : ""}>{e.nome}</span>
                      <span className="ml-3 flex items-center gap-1 text-xs text-[var(--dim)]">
                        <Icon name={RESP_ICON[e.responsavel]} size={13} /> {RESP_LABEL[e.responsavel]}
                      </span>
                      {evs.length > 0 && (
                        <span className="ml-auto rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--mut)]">
                          {evs.length} registro{evs.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {now && evs.length === 0 && (
                        <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}>estamos aqui</span>
                      )}
                    </summary>
                    <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
                      {evs.length === 0 && <p className="text-xs text-[var(--dim)]">Sem registros nesta etapa ainda.</p>}
                      {evs.map((l, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-[11px] text-[var(--dim)]">
                            {new Date(l.created_at).toLocaleString("pt-BR")} · {l.autor ?? "Equipe"}
                          </p>
                          {l.texto && <p className="text-[var(--txt)]">{l.texto}</p>}
                          {l.url && (
                            <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                              Abrir arquivo entregue
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
