"use client";

import { useState } from "react";

type V = {
  name: string; slug: string; category: string; tagline: string; description: string; delivery: string;
  recorrente: boolean; price: string; preco_mensal: string; preco_setup: string; sort_order: string; popular: boolean; active: boolean;
};

const PASSOS = ["Identidade", "Oferta", "Preço", "Publicação", "Revisão"];
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Campo({ l, hint, children }: { l: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--txt)", marginBottom: 2 }}>{l}</span>
      {hint ? <span style={{ display: "block", fontSize: 11.5, color: "var(--mut)", marginBottom: 7, lineHeight: 1.4 }}>{hint}</span> : null}
      {children}
    </label>
  );
}
const inp: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 9, color: "var(--txt)", padding: "9px 11px", fontSize: 13.5, outline: "none", fontFamily: "inherit" };

export default function ProdutoWizard({ produto, editId, action }: {
  produto?: Partial<V>; editId?: string; action: (fd: FormData) => void;
}) {
  const novo = !editId;
  const [step, setStep] = useState(0);
  const [slugManual, setSlugManual] = useState(!novo);
  const [v, setV] = useState<V>({
    name: produto?.name ?? "", slug: produto?.slug ?? "", category: produto?.category ?? "", tagline: produto?.tagline ?? "",
    description: produto?.description ?? "", delivery: produto?.delivery ?? "", recorrente: produto?.recorrente ?? false,
    price: produto?.price ?? "", preco_mensal: produto?.preco_mensal ?? "", preco_setup: produto?.preco_setup ?? "",
    sort_order: produto?.sort_order ?? "", popular: produto?.popular ?? false, active: produto?.active ?? true,
  });
  const set = (k: keyof V, val: string | boolean) => setV((s) => ({ ...s, [k]: val }));
  const podeAvancar = step > 0 || (v.name.trim() && v.slug.trim());

  return (
    <form action={action} className="ex-panel hx-glass" style={{ maxWidth: 720, margin: "0 auto", padding: 0, overflow: "hidden" }}>
      {editId ? <input type="hidden" name="id" value={editId} /> : null}
      {/* progresso */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
        {PASSOS.map((p, i) => (
          <button key={p} type="button" onClick={() => (i < step || podeAvancar ? setStep(i) : null)}
            style={{ flex: 1, padding: "12px 4px", background: "none", border: "none", borderBottom: `2px solid ${i === step ? "var(--accent)" : "transparent"}`, color: i === step ? "var(--accent)" : i < step ? "var(--txt)" : "var(--dim)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {i + 1}. {p}
          </button>
        ))}
      </div>

      <div style={{ padding: 26, minHeight: 320 }}>
        {/* 1 — Identidade */}
        <div style={{ display: step === 0 ? "block" : "none" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Como o produto se chama</h3>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 18 }}>O nome e o endereço do produto. É o que o cliente vê no catálogo.</p>
          <Campo l="Nome do produto" hint="Ex.: PIDE Anual, Prospecção de Leads.">
            <input name="name" value={v.name} onChange={(e) => { set("name", e.target.value); if (novo && !slugManual) set("slug", slugify(e.target.value)); }} required style={inp} />
          </Campo>
          <Campo l="Slug (endereço único)" hint="O identificador na URL — sem espaços nem acentos. Gerado do nome, mas você pode ajustar.">
            <input name="slug" value={v.slug} onChange={(e) => { set("slug", slugify(e.target.value)); setSlugManual(true); }} required style={inp} />
          </Campo>
          <Campo l="Categoria" hint="Agrupa o produto no catálogo. Ex.: Esteira, Leads, Local, Ebook.">
            <input name="category" value={v.category} onChange={(e) => set("category", e.target.value)} style={inp} />
          </Campo>
          <Campo l="Tagline" hint="Uma frase curta que resume a promessa. Aparece no card do produto.">
            <input name="tagline" value={v.tagline} onChange={(e) => set("tagline", e.target.value)} style={inp} />
          </Campo>
        </div>

        {/* 2 — Oferta */}
        <div style={{ display: step === 1 ? "block" : "none" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>O que o cliente recebe</h3>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 18 }}>A descrição da entrega e o formato do serviço.</p>
          <Campo l="Descrição" hint="Explique o que o produto entrega e por quê. É o texto da página do produto.">
            <textarea name="description" value={v.description} onChange={(e) => set("description", e.target.value)} style={{ ...inp, minHeight: 110, resize: "vertical", lineHeight: 1.5 }} />
          </Campo>
          <Campo l="Como é a entrega" hint="Ex.: Esteira contínua · ciclos mensais · Entrega em 4 dias.">
            <input name="delivery" value={v.delivery} onChange={(e) => set("delivery", e.target.value)} style={inp} />
          </Campo>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--mut)" }}>
            <input type="checkbox" name="recorrente" checked={v.recorrente} onChange={(e) => set("recorrente", e.target.checked)} />
            <span><b style={{ color: "var(--txt)" }}>É recorrente?</b> — marque se o cliente paga por mês (mensalidade), como o PIDE. Se for entrega única, deixe desmarcado.</span>
          </label>
        </div>

        {/* 3 — Preço */}
        <div style={{ display: step === 2 ? "block" : "none" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Quanto custa</h3>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 18 }}>Use o campo que faz sentido pro modelo. Recorrente costuma ter mensal (+ setup); avulso usa preço único.</p>
          <Campo l="Preço único (R$)" hint="Para entrega avulsa, cobrada uma vez. Deixe vazio se for recorrente.">
            <input name="price" type="number" step="any" value={v.price} onChange={(e) => set("price", e.target.value)} style={inp} />
          </Campo>
          <Campo l="Preço mensal (R$)" hint="Para produtos recorrentes — o valor da mensalidade.">
            <input name="preco_mensal" type="number" step="any" value={v.preco_mensal} onChange={(e) => set("preco_mensal", e.target.value)} style={inp} />
          </Campo>
          <Campo l="Setup (R$)" hint="Taxa de entrada única, cobrada no início além da mensalidade (opcional).">
            <input name="preco_setup" type="number" step="any" value={v.preco_setup} onChange={(e) => set("preco_setup", e.target.value)} style={inp} />
          </Campo>
        </div>

        {/* 4 — Publicação */}
        <div style={{ display: step === 3 ? "block" : "none" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Publicação</h3>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 18 }}>Como o produto aparece no catálogo do cliente.</p>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--mut)", marginBottom: 14 }}>
            <input type="checkbox" name="active" checked={v.active} onChange={(e) => set("active", e.target.checked)} />
            <span><b style={{ color: "var(--txt)" }}>Ativo</b> — aparece no catálogo público (/produtos). Desmarque pra deixar de rascunho.</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--mut)", marginBottom: 14 }}>
            <input type="checkbox" name="popular" checked={v.popular} onChange={(e) => set("popular", e.target.checked)} />
            <span><b style={{ color: "var(--txt)" }}>Popular</b> — ganha destaque de "mais procurado" no card.</span>
          </label>
          <Campo l="Ordem no catálogo" hint="Número menor aparece primeiro. Ex.: 0, 1, 2…">
            <input name="sort_order" type="number" value={v.sort_order} onChange={(e) => set("sort_order", e.target.value)} style={{ ...inp, maxWidth: 140 }} />
          </Campo>
        </div>

        {/* 5 — Revisão */}
        <div style={{ display: step === 4 ? "block" : "none" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Revisão</h3>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 16 }}>Confira e salve. Depois de salvar, defina o processo (fases e tarefas) do produto.</p>
          <div className="hx-glass" style={{ padding: "14px 16px", borderRadius: 12, fontSize: 13, lineHeight: 1.7 }}>
            <div><b>{v.name || "—"}</b> <span style={{ color: "var(--dim)" }}>/{v.slug || "—"}</span></div>
            <div style={{ color: "var(--mut)" }}>{v.category || "sem categoria"} · {v.recorrente ? `R$ ${v.preco_mensal || "—"}/mês${v.preco_setup ? ` + R$ ${v.preco_setup} setup` : ""}` : v.price ? `R$ ${v.price}` : (v.delivery || "—")}</div>
            {v.tagline ? <div style={{ color: "var(--mut)", fontStyle: "italic", marginTop: 4 }}>&ldquo;{v.tagline}&rdquo;</div> : null}
            <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--dim)" }}>{v.active ? "Ativo no catálogo" : "Rascunho (inativo)"}{v.popular ? " · Popular" : ""}</div>
          </div>
          <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 14 }}>Quer uma leitura antes de publicar? Salve e o <b>Agente de Produtos</b> analisa prazos, equipe e processo, sugerindo melhorias — você decide o que muda.</p>
        </div>
      </div>

      {/* navegação */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 26px", borderTop: "1px solid var(--line)" }}>
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="hx-btn hx-btn-ghost" style={{ opacity: step === 0 ? 0.4 : 1 }}>← Voltar</button>
        {step < PASSOS.length - 1 ? (
          <button type="button" onClick={() => podeAvancar && setStep(step + 1)} className="hx-btn hx-btn-primary" style={{ marginLeft: "auto", opacity: podeAvancar ? 1 : 0.5 }}>Avançar →</button>
        ) : (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="submit" name="analisar" value="0" className="hx-btn hx-btn-ghost">Salvar</button>
            <button type="submit" name="analisar" value="1" className="hx-btn hx-btn-primary">Salvar e analisar com Agente de Produtos</button>
          </div>
        )}
      </div>
    </form>
  );
}
