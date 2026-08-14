"use client";

import { useState } from "react";
import { type Op } from "@/app/expand/comercial/pipeline/page";

const ETAPAS = [
  { key: "lead",        label: "Lead Frio",    cor: "#64748b" },
  { key: "diagnostico", label: "Diagnóstico",  cor: "#0ea5e9" },
  { key: "reuniao",     label: "Reunião",      cor: "#f59e0b" },
  { key: "proposta",    label: "Proposta",     cor: "#8b5cf6" },
  { key: "negociacao",  label: "Negociação",   cor: "#f97316" },
  { key: "fechado",     label: "Fechado ✓",    cor: "#22c55e" },
  { key: "perdido",     label: "Perdido",      cor: "#ef4444" },
];

const ATIVOS = ETAPAS.slice(0, 5).map((e) => e.key);

const ORIGENS = ["instagram", "indicação", "cold-outreach", "google", "evento", "outro"];
const PRODUTOS = [
  { slug: "google-meu-negocio",    label: "Google Meu Negócio" },
  { slug: "prospeccao-de-leads",   label: "Prospecção de Leads" },
  { slug: "ebook-de-autoridade",   label: "Ebook de Autoridade" },
  { slug: "inteligencia-de-mercado", label: "Inteligência de Mercado" },
  { slug: "setup-de-thumbnail",    label: "Setup de Thumbnail" },
];

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function fmtVal(v: number | null) {
  if (!v) return null;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

type Props = {
  ops: Op[];
  perfis: { id: string; nome: string }[];
  pessoaId: string;
  criar: (fd: FormData) => Promise<void>;
  mover: (fd: FormData) => Promise<void>;
  salvar: (fd: FormData) => Promise<void>;
  excluir: (fd: FormData) => Promise<void>;
};

const fld: React.CSSProperties = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "6px 8px", fontSize: 12, outline: "none",
  fontFamily: "inherit", width: "100%",
};

export default function PipelineBoard({ ops, perfis, pessoaId, criar, mover, salvar, excluir }: Props) {
  const [addEtapa, setAddEtapa] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [perdidoId, setPerdidoId] = useState<string | null>(null);

  const byEtapa = (etapa: string) => ops.filter((o) => o.etapa === etapa);
  const idxEtapa = (etapa: string) => ETAPAS.findIndex((e) => e.key === etapa);
  const proximaEtapa = (etapa: string) => ETAPAS[idxEtapa(etapa) + 1]?.key ?? null;
  const anteriorEtapa = (etapa: string) => ETAPAS[idxEtapa(etapa) - 1]?.key ?? null;
  const nomePerfil = (id: string | null) => perfis.find((p) => p.id === id)?.nome ?? id ?? "—";

  const editando = editId ? ops.find((o) => o.id === editId) : null;

  return (
    <div>
      {/* Kanban */}
      <div
        style={{
          display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12,
          scrollbarWidth: "thin",
        }}
      >
        {ETAPAS.map((etapa) => {
          const cards = byEtapa(etapa.key);
          const total = cards.reduce((s, o) => s + (o.valor ?? 0), 0);
          const isAdd = addEtapa === etapa.key;

          return (
            <div
              key={etapa.key}
              style={{
                minWidth: 210, maxWidth: 230, flex: "0 0 220px",
                display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              {/* Cabeçalho da coluna */}
              <div
                style={{
                  borderTop: `3px solid ${etapa.cor}`,
                  background: "var(--panel)",
                  borderRadius: "0 0 8px 8px",
                  padding: "8px 10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: etapa.cor }}>{etapa.label}</span>
                  <span style={{ fontSize: 11, color: "var(--dim)", background: "var(--bg)", borderRadius: 20, padding: "1px 7px" }}>
                    {cards.length}
                  </span>
                </div>
                {total > 0 && (
                  <div style={{ fontSize: 10.5, color: "var(--mut)", marginTop: 2 }}>
                    R$ {total.toLocaleString("pt-BR")}
                  </div>
                )}
              </div>

              {/* Cards */}
              {cards.map((op) => {
                const dias = diasDesde(op.updated_at);
                const prev = anteriorEtapa(op.etapa);
                const next = proximaEtapa(op.etapa);

                return (
                  <div
                    key={op.id}
                    className="hx-glass"
                    style={{ borderRadius: 10, padding: "10px 12px", fontSize: 12 }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--txt)", marginBottom: 2 }}>
                      {op.nome}
                    </div>
                    {op.empresa && (
                      <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>{op.empresa}</div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      {op.produto_slug && (
                        <span style={{ fontSize: 10, background: "var(--panel-2)", color: "var(--mut)", borderRadius: 4, padding: "2px 6px" }}>
                          {PRODUTOS.find((p) => p.slug === op.produto_slug)?.label ?? op.produto_slug}
                        </span>
                      )}
                      {op.origem && (
                        <span style={{ fontSize: 10, background: "var(--panel-2)", color: "var(--mut)", borderRadius: 4, padding: "2px 6px" }}>
                          {op.origem}
                        </span>
                      )}
                    </div>
                    {fmtVal(op.valor) && (
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: etapa.cor, marginBottom: 4 }}>
                        {fmtVal(op.valor)}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--dim)", marginBottom: 8 }}>
                      <span>{nomePerfil(op.responsavel)}</span>
                      <span>{dias === 0 ? "hoje" : `${dias}d`}</span>
                    </div>

                    {/* Botões de movimento */}
                    <div style={{ display: "flex", gap: 4 }}>
                      {prev && (
                        <form action={mover} style={{ flex: 1 }}>
                          <input type="hidden" name="id" value={op.id} />
                          <input type="hidden" name="etapa" value={prev} />
                          <button type="submit" style={{ width: "100%", fontSize: 10.5, padding: "4px", borderRadius: 6, border: "1px solid var(--line)", background: "none", color: "var(--mut)", cursor: "pointer" }}>
                            ← {ETAPAS.find((e) => e.key === prev)?.label}
                          </button>
                        </form>
                      )}
                      {next && next !== "perdido" && (
                        <form action={mover} style={{ flex: 1 }}>
                          <input type="hidden" name="id" value={op.id} />
                          <input type="hidden" name="etapa" value={next} />
                          <button type="submit" style={{ width: "100%", fontSize: 10.5, padding: "4px", borderRadius: 6, border: "none", background: etapa.cor, color: "#000", cursor: "pointer", fontWeight: 700 }}>
                            {ETAPAS.find((e) => e.key === next)?.label} →
                          </button>
                        </form>
                      )}
                      {next === "fechado" && (
                        <form action={mover} style={{ flex: 1 }}>
                          <input type="hidden" name="id" value={op.id} />
                          <input type="hidden" name="etapa" value="fechado" />
                          <button type="submit" style={{ width: "100%", fontSize: 10.5, padding: "4px", borderRadius: 6, border: "none", background: "#22c55e", color: "#000", cursor: "pointer", fontWeight: 700 }}>
                            Fechar ✓
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Ações secundárias */}
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <button
                        onClick={() => setEditId(editId === op.id ? null : op.id)}
                        style={{ flex: 1, fontSize: 10, padding: "3px", borderRadius: 5, border: "1px solid var(--line)", background: "none", color: "var(--dim)", cursor: "pointer" }}
                      >
                        Editar
                      </button>
                      {!["fechado", "perdido"].includes(op.etapa) && (
                        <button
                          onClick={() => setPerdidoId(perdidoId === op.id ? null : op.id)}
                          style={{ flex: 1, fontSize: 10, padding: "3px", borderRadius: 5, border: "1px solid #ef4444", background: "none", color: "#ef4444", cursor: "pointer" }}
                        >
                          Perder
                        </button>
                      )}
                      <form action={excluir}>
                        <input type="hidden" name="id" value={op.id} />
                        <button
                          type="submit"
                          onClick={(e) => { if (!confirm("Excluir?")) e.preventDefault(); }}
                          style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid var(--line)", background: "none", color: "var(--dim)", cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </form>
                    </div>

                    {/* Form de perda */}
                    {perdidoId === op.id && (
                      <form action={mover} style={{ marginTop: 8 }} onSubmit={() => setPerdidoId(null)}>
                        <input type="hidden" name="id" value={op.id} />
                        <input type="hidden" name="etapa" value="perdido" />
                        <input name="motivo_perda" placeholder="Motivo da perda…" style={{ ...fld, marginBottom: 6 }} />
                        <button type="submit" style={{ width: "100%", fontSize: 11, padding: "5px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}>
                          Marcar como perdido
                        </button>
                      </form>
                    )}

                    {/* Form de edição inline */}
                    {editId === op.id && editando && (
                      <form action={salvar} style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }} onSubmit={() => setEditId(null)}>
                        <input type="hidden" name="id" value={op.id} />
                        <input name="nome" defaultValue={op.nome} required placeholder="Nome *" style={fld} />
                        <input name="empresa" defaultValue={op.empresa ?? ""} placeholder="Empresa" style={fld} />
                        <input name="telefone" defaultValue={op.telefone ?? ""} placeholder="Telefone" style={fld} />
                        <select name="produto_slug" defaultValue={op.produto_slug ?? ""} style={fld}>
                          <option value="">Produto—</option>
                          {PRODUTOS.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
                        </select>
                        <input name="valor" type="number" defaultValue={op.valor ?? ""} placeholder="Valor (R$)" style={fld} />
                        <select name="responsavel" defaultValue={op.responsavel ?? ""} style={fld}>
                          <option value="">Responsável—</option>
                          {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                        <select name="origem" defaultValue={op.origem ?? ""} style={fld}>
                          <option value="">Origem—</option>
                          {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <input name="data_reuniao" type="date" defaultValue={op.data_reuniao ?? ""} style={fld} />
                        <textarea name="observacoes" defaultValue={op.observacoes ?? ""} placeholder="Observações" rows={2} style={{ ...fld, resize: "vertical" }} />
                        <div style={{ display: "flex", gap: 5 }}>
                          <button type="submit" style={{ flex: 1, fontSize: 11, padding: "5px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#000", cursor: "pointer", fontWeight: 700 }}>
                            Salvar
                          </button>
                          <button type="button" onClick={() => setEditId(null)} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "none", color: "var(--dim)", cursor: "pointer" }}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}

              {/* Botão + e form de adicionar */}
              {!["fechado", "perdido"].includes(etapa.key) && (
                isAdd ? (
                  <form
                    action={criar}
                    style={{ background: "var(--panel)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}
                    onSubmit={() => setAddEtapa(null)}
                  >
                    <input type="hidden" name="etapa" value={etapa.key} />
                    <input name="nome" required placeholder="Nome do lead *" style={fld} autoFocus />
                    <input name="empresa" placeholder="Empresa" style={fld} />
                    <input name="telefone" placeholder="Telefone" style={fld} />
                    <select name="produto_slug" style={fld}>
                      <option value="">Produto—</option>
                      {PRODUTOS.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
                    </select>
                    <input name="valor" type="number" placeholder="Valor (R$)" style={fld} />
                    <select name="responsavel" defaultValue={pessoaId} style={fld}>
                      <option value="">Responsável—</option>
                      {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    <select name="origem" style={fld}>
                      <option value="">Origem—</option>
                      {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <textarea name="observacoes" placeholder="Observações" rows={2} style={{ ...fld, resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 5 }}>
                      <button type="submit" style={{ flex: 1, fontSize: 11.5, padding: "6px", borderRadius: 6, border: "none", background: etapa.cor, color: "#000", cursor: "pointer", fontWeight: 700 }}>
                        Adicionar
                      </button>
                      <button type="button" onClick={() => setAddEtapa(null)} style={{ fontSize: 11, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "none", color: "var(--dim)", cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setAddEtapa(etapa.key)}
                    style={{ width: "100%", padding: "7px", borderRadius: 8, border: `1px dashed ${etapa.cor}40`, background: "none", color: etapa.cor, fontSize: 12, cursor: "pointer" }}
                  >
                    + Lead
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
