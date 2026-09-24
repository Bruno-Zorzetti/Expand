"use client";

import { useActionState, useState } from "react";
import type { VmaImovel, PortalAnalise } from "./actions";

const TIPOS = ["Apartamento", "Casa", "Sobrado", "Kitnet/Studio", "Cobertura", "Terreno/Lote", "Sala Comercial", "Galpão", "Sítio/Fazenda", "Outro"];
const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const STATUS_OPTS = ["Ativo", "Suspenso", "Vendido", "Locado"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line-2)",
  background: "var(--bg)", color: "var(--txt)", fontSize: 13, outline: "none",
  width: "100%", boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp, cursor: "pointer" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="ex-grph" style={{ marginBottom: 16 }}>
        <span className="gt">{title}</span><span className="gl" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  const [val, setVal] = useState(checked);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "var(--txt)" }}>
      <input type="checkbox" name={name} value="1" checked={val} onChange={() => setVal(!val)}
        style={{ width: 15, height: 15, accentColor: "var(--accent)" }} />
      {label}
    </label>
  );
}

type Foto = { url: string; principal: boolean; nome: string };

function FotosEditor({ initial }: { initial: Foto[] }) {
  const [fotos, setFotos] = useState<Foto[]>(initial);
  const [nova, setNova] = useState("");

  function add() {
    const url = nova.trim();
    if (!url) return;
    setFotos(prev => [...prev, { url, principal: prev.length === 0, nome: "" }]);
    setNova("");
  }

  function remove(i: number) {
    setFotos(prev => {
      const next = prev.filter((_, j) => j !== i);
      if (next.length > 0 && !next.some(f => f.principal)) next[0].principal = true;
      return next;
    });
  }

  function setPrincipal(i: number) {
    setFotos(prev => prev.map((f, j) => ({ ...f, principal: j === i })));
  }

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <input type="hidden" name="fotos_json" value={JSON.stringify(fotos)} />

      {/* Adicionar URL */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="url"
          placeholder="https://… cole a URL da foto"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          style={{ ...inp, flex: 1 }}
        />
        <button type="button" onClick={add} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          + Adicionar
        </button>
      </div>

      {fotos.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "16px 0" }}>
          Nenhuma foto adicionada. Cole URLs de imagens acima.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {fotos.map((f, i) => (
          <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: f.principal ? "2px solid var(--accent)" : "1px solid var(--line-2)" }}>
            <img src={f.url} alt={`Foto ${i+1}`} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
            <div style={{ display: "flex", gap: 4, padding: "4px 6px", background: "var(--panel-2)" }}>
              <button type="button" onClick={() => setPrincipal(i)} style={{ flex: 1, fontSize: 9, fontWeight: 700, padding: "2px 4px", borderRadius: 4, border: f.principal ? "none" : "1px solid var(--line-2)", background: f.principal ? "var(--accent)" : "transparent", color: f.principal ? "#fff" : "var(--dim)", cursor: "pointer" }}>
                {f.principal ? "★ Capa" : "Tornar capa"}
              </button>
              <button type="button" onClick={() => remove(i)} style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid var(--line-2)", background: "transparent", color: "var(--red)", cursor: "pointer", fontSize: 11 }}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Painel de análise pós-save ────────────────────────────────────────────────

const PORTAL_ICON: Record<string, string> = {
  olx: "🔶", chavenamao: "🔑", mercadolivre: "🛒",
};

function AnalisePortal({ a }: { a: PortalAnalise }) {
  const cor = a.ok ? "#22c55e" : a.erros.length > 0 ? "#ef4444" : "#f59e0b";
  const icone = a.ok ? "✓" : a.erros.length > 0 ? "✕" : "⚠";
  return (
    <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 18px", borderLeft: `3px solid ${cor}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: a.erros.length + a.avisos.length > 0 ? 10 : 0 }}>
        <span style={{ fontSize: 18 }}>{PORTAL_ICON[a.portal] || "📋"}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{a.label}</span>
        <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 13, color: cor }}>{icone} {a.ok ? "Pronto" : a.erros.length > 0 ? `${a.erros.length} erro${a.erros.length > 1 ? "s" : ""}` : `${a.avisos.length} aviso${a.avisos.length > 1 ? "s" : ""}`}</span>
      </div>
      {a.erros.map((e, i) => (
        <div key={i} style={{ fontSize: 12, color: "#ef4444", padding: "2px 0 2px 8px", borderLeft: "2px solid #ef4444", marginBottom: 4 }}>✕ {e}</div>
      ))}
      {a.avisos.map((v, i) => (
        <div key={i} style={{ fontSize: 12, color: "#f59e0b", padding: "2px 0 2px 8px", borderLeft: "2px solid #f59e0b", marginBottom: 4 }}>⚠ {v}</div>
      ))}
    </div>
  );
}

function PainelAnalise({ analise, feedUrl, imovelId }: { analise: PortalAnalise[]; feedUrl: string; imovelId: string }) {
  const todos_ok = analise.every(a => a.ok);
  const com_erro = analise.filter(a => !a.ok && a.erros.length > 0).length;
  const portaisAtivos = analise.length;

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{todos_ok || portaisAtivos === 0 ? "🚀" : com_erro > 0 ? "⚠️" : "✅"}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {portaisAtivos === 0 ? "Imóvel salvo" : todos_ok ? "Imóvel publicado nos portais!" : "Salvo — ajustes recomendados"}
            </div>
            <div style={{ fontSize: 13, color: "var(--mut)" }}>
              {portaisAtivos === 0
                ? "Nenhum portal selecionado. Ative um portal na seção Portais para publicar."
                : todos_ok
                ? `Publicado em ${portaisAtivos} portal${portaisAtivos > 1 ? "is" : ""}. O feed XML atualiza em até 1h no CDN.`
                : "Feed atualizado no banco. Corrija os erros para garantir exibição nos portais."}
            </div>
          </div>
        </div>
      </div>

      {/* Status do feed */}
      {portaisAtivos > 0 && (
        <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>📡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Feed XML atualizado</div>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>
              <a href={feedUrl} target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>{feedUrl}</a>
              {" — "} portais buscam automaticamente a cada 1-4h
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", padding: "3px 10px", borderRadius: 20, background: "color-mix(in srgb, #22c55e 12%, transparent)", border: "1px solid color-mix(in srgb, #22c55e 25%, transparent)" }}>
            ● LIVE
          </span>
        </div>
      )}

      {/* Análise por portal */}
      {analise.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Análise por portal</div>
          {analise.map(a => <AnalisePortal key={a.portal} a={a} />)}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: "flex", gap: 10 }}>
        <a href={`/expand/vma/imoveis/${imovelId}`}
          style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--accent)", color: "var(--accent)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          Editar imóvel
        </a>
        <a href="/expand/vma/imoveis"
          style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--line-2)", color: "var(--mut)", fontSize: 13, textDecoration: "none" }}>
          Ver todos os imóveis
        </a>
      </div>
    </div>
  );
}

// ── Formulário ────────────────────────────────────────────────────────────────

export default function ImovelForm({
  imovel,
  action,
  submitLabel = "Salvar e publicar",
}: {
  imovel?: Partial<VmaImovel>;
  action: (prev: unknown, fd: FormData) => Promise<{ error?: string } | { success: true; imovelId: string; analise: PortalAnalise[]; feedUrl: string } | void>;
  submitLabel?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);

  // Após save bem-sucedido, mostra painel de análise
  if (state != null && typeof state === "object" && "success" in state && state.success) {
    const s = state as { success: true; imovelId: string; analise: PortalAnalise[]; feedUrl: string };
    return <PainelAnalise analise={s.analise} feedUrl={s.feedUrl} imovelId={s.imovelId} />;
  }

  return (
    <form action={dispatch} style={{ maxWidth: 900 }}>
      {imovel?.id && <input type="hidden" name="id" value={imovel.id} />}

      {state != null && typeof state === "object" && "error" in state && state.error ? (
        <div style={{ padding: "10px 16px", borderRadius: 8, background: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", color: "var(--red)", fontSize: 13, marginBottom: 20 }}>
          {String((state as { error: unknown }).error)}
        </div>
      ) : null}

      <Section title="Identificação">
        <Field label="Título *">
          <input name="titulo" defaultValue={imovel?.titulo ?? ""} required style={inp} placeholder="Ex: Apartamento 3 quartos no Centro" />
        </Field>
        <Field label="Código (referência)">
          <input name="codigo" defaultValue={imovel?.codigo ?? ""} style={inp} placeholder="Ex: AP-001" />
        </Field>
        <Field label="Finalidade *">
          <select name="finalidade" defaultValue={imovel?.finalidade ?? "Venda"} style={sel}>
            <option>Venda</option>
            <option>Locação</option>
            <option>Venda e Locação</option>
          </select>
        </Field>
        <Field label="Tipo de imóvel *">
          <select name="tipo" defaultValue={imovel?.tipo ?? ""} required style={sel}>
            <option value="">— Selecione —</option>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Subtipo">
          <input name="subtipo" defaultValue={imovel?.subtipo ?? ""} style={inp} placeholder="Ex: Alto padrão" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={imovel?.status ?? "Ativo"} style={sel}>
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Localização">
        <Field label="Estado">
          <select name="estado" defaultValue={imovel?.estado ?? ""} style={sel}>
            <option value="">— UF —</option>
            {ESTADOS.map(e => <option key={e}>{e}</option>)}
          </select>
        </Field>
        <Field label="Cidade *">
          <input name="cidade" defaultValue={imovel?.cidade ?? ""} required style={inp} placeholder="Ex: São Paulo" />
        </Field>
        <Field label="Bairro">
          <input name="bairro" defaultValue={imovel?.bairro ?? ""} style={inp} placeholder="Ex: Jardins" />
        </Field>
        <Field label="Endereço">
          <input name="endereco" defaultValue={imovel?.endereco ?? ""} style={inp} placeholder="Rua / Avenida" />
        </Field>
        <Field label="Número">
          <input name="numero" defaultValue={imovel?.numero ?? ""} style={inp} placeholder="123" />
        </Field>
        <Field label="Complemento">
          <input name="complemento" defaultValue={imovel?.complemento ?? ""} style={inp} placeholder="Apto 4, Bl A…" />
        </Field>
        <Field label="CEP">
          <input name="cep" defaultValue={imovel?.cep ?? ""} style={inp} placeholder="00000-000" />
        </Field>
      </Section>

      <Section title="Preços">
        <Field label="Preço de venda (R$)">
          <input name="preco_venda" type="number" min="0" step="1000" defaultValue={imovel?.preco_venda || ""} style={inp} placeholder="0" />
        </Field>
        <Field label="Preço de locação (R$)">
          <input name="preco_locacao" type="number" min="0" step="100" defaultValue={imovel?.preco_locacao || ""} style={inp} placeholder="0" />
        </Field>
        <Field label="Condomínio (R$)">
          <input name="preco_condominio" type="number" min="0" step="50" defaultValue={imovel?.preco_condominio || ""} style={inp} placeholder="0" />
        </Field>
        <Field label="IPTU anual (R$)">
          <input name="preco_iptu" type="number" min="0" step="100" defaultValue={imovel?.preco_iptu || ""} style={inp} placeholder="0" />
        </Field>
      </Section>

      <Section title="Características">
        <Field label="Área total (m²)">
          <input name="area_total" type="number" min="0" step="0.01" defaultValue={imovel?.area_total || ""} style={inp} placeholder="0" />
        </Field>
        <Field label="Área útil (m²)">
          <input name="area_util" type="number" min="0" step="0.01" defaultValue={imovel?.area_util || ""} style={inp} placeholder="0" />
        </Field>
        <Field label="Quartos">
          <input name="quartos" type="number" min="0" defaultValue={imovel?.quartos || 0} style={inp} />
        </Field>
        <Field label="Suítes">
          <input name="suites" type="number" min="0" defaultValue={imovel?.suites || 0} style={inp} />
        </Field>
        <Field label="Banheiros">
          <input name="banheiros" type="number" min="0" defaultValue={imovel?.banheiros || 0} style={inp} />
        </Field>
        <Field label="Vagas de garagem">
          <input name="vagas" type="number" min="0" defaultValue={imovel?.vagas || 0} style={inp} />
        </Field>
        <Field label="Salas">
          <input name="salas" type="number" min="0" defaultValue={imovel?.salas || 0} style={inp} />
        </Field>
      </Section>

      <Section title="Amenidades">
        <Check name="piscina"         label="Piscina"          checked={!!imovel?.piscina} />
        <Check name="churrasqueira"   label="Churrasqueira"    checked={!!imovel?.churrasqueira} />
        <Check name="sauna"           label="Sauna"            checked={!!imovel?.sauna} />
        <Check name="varanda"         label="Varanda"          checked={!!imovel?.varanda} />
        <Check name="varanda_gourmet" label="Varanda gourmet"  checked={!!imovel?.varanda_gourmet} />
        <Check name="mobiliado"       label="Mobiliado"        checked={!!imovel?.mobiliado} />
        <Check name="ar_condicionado" label="Ar-condicionado"  checked={!!imovel?.ar_condicionado} />
        <Check name="elevador"        label="Elevador"         checked={!!imovel?.elevador} />
        <Check name="academia"        label="Academia"         checked={!!imovel?.academia} />
        <Check name="portaria"        label="Portaria 24h"     checked={!!imovel?.portaria} />
      </Section>

      {/* Descrição — largura total */}
      <div style={{ marginBottom: 28 }}>
        <div className="ex-grph" style={{ marginBottom: 16 }}>
          <span className="gt">Descrição</span><span className="gl" />
        </div>
        <textarea
          name="descricao"
          defaultValue={imovel?.descricao ?? ""}
          rows={5}
          style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
          placeholder="Descreva o imóvel com detalhes: localização, diferenciais, estado de conservação…"
        />
      </div>

      {/* Fotos */}
      <div style={{ marginBottom: 28 }}>
        <div className="ex-grph" style={{ marginBottom: 16 }}>
          <span className="gt">Fotos</span>
          <span className="gc">Cole URLs de imagens</span>
          <span className="gl" />
        </div>
        <FotosEditor initial={imovel?.fotos ?? []} />
      </div>

      {/* Links de mídia */}
      <Section title="Links de mídia">
        <Field label="Vídeo (YouTube, etc.)">
          <input name="link_video" type="url" defaultValue={imovel?.link_video ?? ""} style={inp} placeholder="https://youtube.com/…" />
        </Field>
        <Field label="Tour virtual">
          <input name="link_tour" type="url" defaultValue={imovel?.link_tour ?? ""} style={inp} placeholder="https://…" />
        </Field>
      </Section>

      {/* Portais */}
      <div style={{ marginBottom: 28 }}>
        <div className="ex-grph" style={{ marginBottom: 16 }}>
          <span className="gt">Portais de divulgação</span><span className="gl" />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Check name="portal_olx"          label="OLX Canal Pro"     checked={!!imovel?.portais?.olx} />
          <Check name="portal_chavenamao"   label="Chave na Mão"      checked={!!imovel?.portais?.chavenamao} />
          <Check name="portal_mercadolivre" label="Mercado Livre"     checked={!!imovel?.portais?.mercadolivre} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
        <button
          type="submit"
          disabled={pending}
          style={{ padding: "10px 28px", borderRadius: 10, background: "var(--accent)", color: "#fff", border: "none", cursor: pending ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, opacity: pending ? 0.7 : 1 }}
        >
          {pending ? "Salvando e analisando…" : submitLabel}
        </button>
        <a href="/expand/vma/imoveis" style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--line-2)", color: "var(--mut)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Cancelar
        </a>
      </div>
    </form>
  );
}
