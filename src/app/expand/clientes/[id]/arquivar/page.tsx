import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import { salvarFeedbackEncerramento, salvarChecklistEncerramento, confirmarEncerramento } from "@/app/expand/actions";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

const MOTIVOS = [
  "Preço", "Resultado insatisfatório", "Mudança de estratégia interna",
  "Migrou para concorrente", "Encerramento da empresa", "Prazo contratual encerrado",
  "Relacionamento / atendimento", "Outro",
];

const fld: CSSProperties = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};

type Cli = { id: string; nome: string; whatsapp_grupo: string | null; drive_folder_url: string | null; ativo: boolean; imagem_url: string | null };
type Etapa = { id: string; titulo: string; area: string | null; status: string | null; visivel_cliente: boolean; criado_em: string; fase: number | null };
type Log = { tipo: string | null; detalhe: string | null; criado_em: string };

function StepBar({ step }: { step: number }) {
  const steps = ["Feedback", "Checklist", "Relatório & Confirmar"];
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done = step > n;
        const cur = step === n;
        return (
          <div key={s} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13,
                background: done ? "var(--green)" : cur ? "var(--accent)" : "var(--panel-2)",
                color: done || cur ? "#0E1F18" : "var(--mut)",
                border: `2px solid ${done ? "var(--green)" : cur ? "var(--accent)" : "var(--line)"}`,
              }}>
                {done ? "✓" : n}
              </div>
              <div style={{ fontSize: 11, color: done ? "var(--green)" : cur ? "var(--txt)" : "var(--dim)", fontWeight: cur ? 700 : 400, marginTop: 4, textAlign: "center" }}>{s}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height: 2, flex: 0.8, background: done ? "var(--green)" : "var(--line)", margin: "0 4px", marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function UrgLabel({ u }: { u: "alta" | "media" | "baixa" }) {
  const map = { alta: { c: "var(--red)", l: "Imediato" }, media: { c: "var(--warn)", l: "48h" }, baixa: { c: "var(--green)", l: "Antes de fechar" } };
  const { c, l } = map[u];
  return <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, padding: "2px 7px", borderRadius: 6, flexShrink: 0 }}>{l}</span>;
}

export default async function ArquivarWizard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { id } = await params;
  const { step: stepParam } = await searchParams;
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();
  if (!isAdmin) redirect(`/expand/clientes/${id}`);

  const { data: cData } = await supabase.from("expand_clientes").select("id, nome, whatsapp_grupo, drive_folder_url, ativo, imagem_url").eq("id", id).maybeSingle();
  if (!cData) notFound();
  const cli = cData as Cli;

  const { data: etData } = await supabase.from("expand_etapas").select("id, titulo, area, status, visivel_cliente, criado_em, fase").eq("cliente_id", id).order("criado_em");
  const etapas = (etData ?? []) as Etapa[];

  // Verificar qual step já tem dados salvos
  const { data: logs } = await supabase.from("expand_log").select("tipo, detalhe, criado_em").eq("cliente_id", id).in("tipo", ["enc_feedback", "enc_checklist"]).order("criado_em", { ascending: false });
  const logMap = new Map((logs ?? []).map((l: Log) => [l.tipo, l]));
  const hasFeedback = logMap.has("enc_feedback");
  const hasChecklist = logMap.has("enc_checklist");

  const step = (() => {
    const n = Number(stepParam ?? 1);
    if (n === 3 && hasFeedback && hasChecklist) return 3;
    if (n === 2 && hasFeedback) return 2;
    return 1;
  })();

  const emRun = etapas.filter(e => e.status === "run").length;
  const temTrafego = etapas.some(e => (e.area ?? "").toLowerCase().includes("traf") && e.status === "run");
  const entregues = etapas.filter(e => e.status === "done" && e.visivel_cliente);
  const abertas = etapas.filter(e => e.status === "run" || e.status === "idle");

  // Checklist dinâmico
  type Urgencia = "alta" | "media" | "baixa";
  const ITEMS = ([
    { id: "pausar_trafego", label: "Pausar tráfego pago imediatamente", desc: "Para evitar novos gastos em campanhas ativas. Acesse o Gerenciador de Anúncios e pause todas as campanhas deste cliente.", urgencia: "alta" as Urgencia, show: temTrafego },
    { id: "cancelar_tarefas", label: `Cancelar ou pausar tarefas abertas (${emRun} em execução)`, desc: "Revise o kanban e cancele entregas que não farão mais sentido. Tarefas que já foram iniciadas podem ser registradas como parciais.", urgencia: "alta" as Urgencia, show: emRun > 0 },
    { id: "notificar_equipe", label: "Notificar equipe do encerramento", desc: "Avisar todos os membros da squad do cliente para pararem de gerar trabalho novo. Usar o canal interno da equipe.", urgencia: "alta" as Urgencia, show: true },
    { id: "sair_grupo_wpp", label: "Remover equipe do grupo de WhatsApp do cliente", desc: "Antes de sair, fazer print ou backup das mensagens importantes. Depois remover os membros da equipe um a um.", urgencia: "media" as Urgencia, show: !!cli.whatsapp_grupo },
    { id: "arquivar_grupo_wpp", label: "Arquivar ou excluir o grupo de WhatsApp", desc: `Grupo "${cli.whatsapp_grupo ?? "—"}" pode ser arquivado ou excluído. Fazer backup completo das conversas se houver material relevante antes de excluir.`, urgencia: "media" as Urgencia, show: !!cli.whatsapp_grupo },
    { id: "revogar_senhas", label: "Revogar senhas e acessos compartilhados", desc: "Remover o cliente de ferramentas internas: Notion, Canva, planilhas compartilhadas, drives com permissão de edição.", urgencia: "media" as Urgencia, show: true },
    { id: "orientar_senhas", label: "Orientar cliente a alterar senhas próprias", desc: "Enviar checklist: ferramentas de tráfego, social media, analytics, hospedagem — qualquer sistema onde a equipe teve acesso.", urgencia: "media" as Urgencia, show: true },
    { id: "backup_drive", label: `Fazer backup da pasta do Drive → mover para "Arquivados > ${cli.nome}"`, desc: "Criar pasta Arquivados (se não existir), mover toda a pasta do cliente para dentro. Isso preserva os registros de forma organizada.", urgencia: "media" as Urgencia, show: !!cli.drive_folder_url },
    { id: "relatorio_entregaveis", label: "Gerar e enviar relatório de entregáveis ao cliente", desc: "Use o relatório gerado no Passo 3 desta página. Enviar por email ou WhatsApp antes da reunião de encerramento.", urgencia: "media" as Urgencia, show: true },
    { id: "distrato", label: "Assinar distrato contratual", desc: "Formalizar o encerramento com documento assinado pelas duas partes. Salvar no Drive do cliente antes de mover para Arquivados.", urgencia: "baixa" as Urgencia, show: true },
    { id: "reuniao_encerramento", label: "Agendar reunião ou call de encerramento", desc: "Entregar o relatório pessoalmente, coletar feedback direto, manter o relacionamento positivo. Pode gerar uma indicação futura.", urgencia: "baixa" as Urgencia, show: true },
    { id: "fechar_portal", label: "Fechar acesso ao portal do cliente", desc: "No sistema, mude o papel do usuário ou desative o login. O status 'churned' já limita o acesso, mas confirme manualmente.", urgencia: "baixa" as Urgencia, show: true },
  ] as { id: string; label: string; desc: string; urgencia: Urgencia; show: boolean }[]).filter(x => x.show);

  // Feedback salvo (para exibição)
  let feedbackSalvo: { motivo: string; detalhe: string; nps: string } | null = null;
  if (hasFeedback) {
    try { feedbackSalvo = JSON.parse(String(logMap.get("enc_feedback")!.detalhe)); } catch { /* noop */ }
  }

  // Agrupamento de entregues por área para o relatório
  const areaMap = new Map<string, Etapa[]>();
  for (const e of entregues) {
    const k = e.area ?? "Geral";
    if (!areaMap.has(k)) areaMap.set(k, []);
    areaMap.get(k)!.push(e);
  }

  const ini = cli.nome.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 0 64px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p className="hx-eyebrow">
          <Link href="/expand/carteira" style={{ color: "var(--dim)", textDecoration: "none" }}>Clientes</Link>
          {" · "}
          <Link href={`/expand/clientes/${id}`} style={{ color: "var(--dim)", textDecoration: "none" }}>{cli.nome}</Link>
          {" · "}encerrar conta
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          {cli.imagem_url ? (
            <img src={cli.imagem_url} alt={cli.nome} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "contain", background: "var(--panel-2)", padding: 4, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "color-mix(in srgb, var(--warn) 18%, var(--panel-2))", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 800, color: "var(--warn)", flexShrink: 0 }}>{ini}</div>
          )}
          <div>
            <h1 className="ex-h1" style={{ margin: 0 }}>Encerrar conta — {cli.nome}</h1>
            <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 2 }}>Este processo não pode ser desfeito. Siga cada etapa com atenção.</div>
          </div>
        </div>

        {/* Aviso de status */}
        {!cli.ativo && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--warn) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)", color: "var(--warn)", fontSize: 12.5, marginTop: 8 }}>
            ⚠️ Esta conta já está marcada como encerrada. Você ainda pode completar o checklist de encerramento.
          </div>
        )}
      </div>

      <StepBar step={step} />

      {/* ═══════════ STEP 1 — FEEDBACK ═══════════ */}
      {step === 1 && (
        <div className="hx-glass" style={{ borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Por que o cliente está saindo?</div>
          <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 20, lineHeight: 1.6 }}>
            Este feedback vai para a memória do <strong>CS</strong> (melhorar retenção) e do <strong>PMO</strong> (encerrar o roadmap corretamente). Seja específico — é o dado mais valioso de um encerramento.
          </div>
          <form action={salvarFeedbackEncerramento} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input type="hidden" name="id" value={id} />

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>Motivo principal *</label>
              <select name="motivo" required style={fld}>
                <option value="">— selecione —</option>
                {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>Feedback real — o que o cliente disse ou o PMO entendeu *</label>
              <textarea name="detalhe" rows={4} required placeholder="Ex: 'Achamos caro para o resultado que estávamos vendo. Queriam mais leads diretos, mas a estratégia era de médio prazo.' — Seja específico, evite genéricos." style={{ ...fld, resize: "vertical" }} />
              <span style={{ fontSize: 11, color: "var(--dim)" }}>Fica salvo no PMO e no CS como aprendizado de produto.</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>NPS de saída (0–10, se coletado)</label>
              <input name="nps" type="number" min={0} max={10} placeholder="—" style={{ ...fld, maxWidth: 120 }} />
            </div>

            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "10px 24px" }}>
                Salvar feedback e continuar →
              </button>
              <Link href={`/expand/clientes/${id}`} className="hx-btn hx-btn-ghost" style={{ padding: "10px 20px" }}>Cancelar</Link>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════ STEP 2 — CHECKLIST ═══════════ */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Feedback resumido */}
          {feedbackSalvo && (
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--green)", marginBottom: 4 }}>Feedback salvo ✓</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{feedbackSalvo.motivo}</div>
              {feedbackSalvo.detalhe && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{feedbackSalvo.detalhe}</div>}
            </div>
          )}

          <div className="hx-glass" style={{ borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Checklist de encerramento</div>
            <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 20, lineHeight: 1.6 }}>
              Marque cada item conforme for concluindo. Os itens <strong style={{ color: "var(--red)" }}>imediatos</strong> devem ser feitos antes de sair desta página — evitam custos e exposição de segurança.
            </div>
            <form action={salvarChecklistEncerramento} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <input type="hidden" name="id" value={id} />

              {(["alta", "media", "baixa"] as const).map(urg => {
                const items = ITEMS.filter(x => x.urgencia === urg);
                if (!items.length) return null;
                const label = urg === "alta" ? "🔴 Imediato — parar custos e notificar" : urg === "media" ? "🟡 Dentro de 48h — segurança e backups" : "🟢 Antes de fechar — jurídico e encerramento";
                return (
                  <div key={urg} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: urg === "alta" ? "var(--red)" : urg === "media" ? "var(--warn)" : "var(--green)", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>
                      {label}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map(item => (
                        <label key={item.id} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: "1px solid var(--line)", background: "var(--panel-2)", alignItems: "flex-start" }}>
                          <input type="checkbox" name="item" value={item.id} style={{ marginTop: 2, flexShrink: 0, accentColor: "var(--accent)", width: 16, height: 16 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{item.label}</span>
                              <UrgLabel u={item.urgencia} />
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--mut)", lineHeight: 1.5 }}>{item.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div style={{ paddingTop: 8, display: "flex", gap: 10 }}>
                <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "10px 24px" }}>
                  Salvar progresso e ver relatório →
                </button>
                <Link href={`/expand/clientes/${id}/arquivar?step=1`} className="hx-btn hx-btn-ghost" style={{ padding: "10px 20px" }}>← Voltar</Link>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 3 — RELATÓRIO + CONFIRMAÇÃO ═══════════ */}
      {step === 3 && (() => {
        // Compute checklist items not marked done → offer as tasks
        let checkedIds: string[] = [];
        if (hasChecklist) {
          try { checkedIds = JSON.parse(String(logMap.get("enc_checklist")!.detalhe)); } catch { /* noop */ }
        }
        const itensPendentes = ITEMS.filter(i => !checkedIds.includes(i.id));

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Relatório de entregáveis */}
            <div className="hx-glass" style={{ borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Relatório de entregáveis — {cli.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--mut)" }}>{entregues.length} entregas concluídas · {abertas.length} em aberto</div>
                </div>
              </div>

              {entregues.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--dim)", fontSize: 13 }}>
                  Nenhuma entrega concluída registrada para este cliente.
                </div>
              ) : (
                <div>
                  {[...areaMap.entries()].map(([area, items]) => (
                    <div key={area} style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid var(--line)" }}>
                        {area}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {items.map(e => (
                          <div key={e.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "var(--panel-2)" }}>
                            <span style={{ color: "var(--green)", fontSize: 12, flexShrink: 0 }}>✓</span>
                            <span style={{ flex: 1, fontSize: 13, color: "var(--txt)" }}>{e.titulo}</span>
                            <span style={{ fontSize: 11, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>
                              {new Date(e.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {abertas.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--warn)", marginBottom: 8 }}>
                    Itens em aberto no encerramento ({abertas.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {abertas.map(e => (
                      <div key={e.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--warn) 8%, transparent)" }}>
                        <span style={{ color: "var(--warn)", fontSize: 12, flexShrink: 0 }}>○</span>
                        <span style={{ flex: 1, fontSize: 13, color: "var(--txt)" }}>{e.titulo}</span>
                        <span style={{ fontSize: 11, color: "var(--warn)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{e.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resumo do feedback */}
            {feedbackSalvo && (
              <div style={{ padding: "14px 18px", borderRadius: 12, background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 6 }}>Feedback salvo — PMO e CS</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{feedbackSalvo.motivo}</div>
                {feedbackSalvo.detalhe && <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 3, lineHeight: 1.55 }}>{feedbackSalvo.detalhe}</div>}
                {feedbackSalvo.nps && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>NPS de saída: <strong>{feedbackSalvo.nps}/10</strong></div>}
              </div>
            )}

            {/* Confirmação — form único que engloba tarefas pendentes */}
            <form action={confirmarEncerramento}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="nomeCli" value={cli.nome} />

              {/* Tarefas de encerramento pendentes */}
              {itensPendentes.length > 0 && (
                <div style={{ padding: "20px 24px", borderRadius: 16, background: "var(--panel-2)", border: "1px solid var(--line)", marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Criar tarefas de encerramento para a equipe?</div>
                  <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, marginBottom: 16 }}>
                    {itensPendentes.length} item{itensPendentes.length > 1 ? "ns" : ""} do checklist ainda não foram concluídos. Marque os que devem virar tarefas formais no kanban da equipe.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {itensPendentes.map(item => (
                      <label key={item.id} style={{ display: "flex", gap: 12, padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: "1px solid var(--line)", background: "var(--bg)", alignItems: "flex-start" }}>
                        <input type="checkbox" name="tarefa" value={item.label} defaultChecked style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--accent)", width: 15, height: 15 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)" }}>{item.label}</span>
                            <UrgLabel u={item.urgencia} />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Zona de perigo — confirmar */}
              <div style={{ padding: "20px 24px", borderRadius: 16, border: "1px solid color-mix(in srgb, var(--red) 35%, transparent)", background: "color-mix(in srgb, var(--red) 5%, transparent)" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--red)", marginBottom: 6 }}>Confirmar encerramento</div>
                <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, marginBottom: 18 }}>
                  O cliente sai do painel, o status muda para <strong>churned</strong>, o feedback vai para a memória do PMO e do CS, e o acesso ao portal é encerrado. Esta ação não pode ser desfeita.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {itensPendentes.length > 0 ? (
                    <button type="submit" name="modo" value="com_tarefas" className="hx-btn" style={{
                      padding: "11px 26px", fontSize: 13, fontWeight: 800,
                      background: "var(--red)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
                    }}>
                      Encerrar + criar tarefas selecionadas
                    </button>
                  ) : null}
                  <button type="submit" name="modo" value="so_arquivar" className="hx-btn" style={{
                    padding: "11px 26px", fontSize: 13, fontWeight: 800,
                    background: itensPendentes.length > 0 ? "transparent" : "var(--red)",
                    color: itensPendentes.length > 0 ? "var(--red)" : "#fff",
                    border: itensPendentes.length > 0 ? "1.5px solid var(--red)" : "none",
                    borderRadius: 10, cursor: "pointer",
                  }}>
                    {itensPendentes.length > 0 ? "Só arquivar" : `Encerrar conta de ${cli.nome}`}
                  </button>
                  <Link href={`/expand/clientes/${id}/arquivar?step=2`} className="hx-btn hx-btn-ghost" style={{ padding: "11px 20px" }}>
                    ← Voltar ao checklist
                  </Link>
                </div>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
}
