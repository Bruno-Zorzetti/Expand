import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import { salvarEmpresa } from "./actions";

export const dynamic = "force-dynamic";

type Empresa = {
  nome: string; tagline: string | null; missao: string | null; cnpj: string | null;
  setor: string | null; site: string | null; email: string | null; telefone: string | null;
  endereco: string | null; instagram: string | null; youtube: string | null; linkedin: string | null;
  logo_url: string | null; manual_url: string | null; cor_primaria: string | null;
  cor_acento: string | null; valores: string[] | null; fundadores: unknown;
  atualizado_em: string | null;
};

type Fundador = { nome: string; cargo: string; id: string };

const fld: React.CSSProperties = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "9px 11px", fontSize: 13, fontFamily: "inherit", width: "100%",
};
const lab: React.CSSProperties = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 4, display: "block",
};
const swatch = (cor: string) => (
  <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: cor, border: "1px solid var(--line-2)", verticalAlign: "middle", marginRight: 5 }} />
);

export default async function EmpresaPage() {
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();

  const { data } = await supabase.from("expand_empresa_config").select("*").eq("id", "expand").single();
  const e = (data ?? {}) as Partial<Empresa>;

  const fundadores = (Array.isArray(e.fundadores) ? e.fundadores : []) as Fundador[];
  const valores = e.valores ?? ["Clareza", "Tradição", "Autoridade", "Resultado"];
  const corPrimaria = e.cor_primaria ?? "#1B3826";
  const corAcento = e.cor_acento ?? "#C89B5E";

  const { data: ps } = await supabase.from("expand_perfis").select("id, nome, cargo, foto_url").eq("tipo", "humano").order("nome");
  const perfis = ps ?? [];

  return (
    <>
      <p className="hx-eyebrow">Configurações · identidade</p>
      <h1 className="ex-h1">Configurações da <span className="hx-accent-text">empresa</span></h1>
      <p className="ex-sub">Identidade visual, informações institucionais e fundadores do Grupo Expand. Usadas em documentos PDF, apresentações e portal do cliente.</p>

      {/* Preview da identidade visual */}
      <div className="hx-glass" style={{ borderRadius: 14, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ background: corPrimaria, padding: "24px 28px", display: "flex", alignItems: "center", gap: 20 }}>
          {e.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.logo_url} alt="Logo" style={{ height: 52, width: "auto", objectFit: "contain" }} />
          ) : (
            <svg width="48" height="50" viewBox="0 0 80 84" fill="none">
              <path d="M40 6 L66 18 L66 54 Q66 72 40 80 Q14 72 14 54 L14 18 Z" fill="none" stroke={corAcento} strokeWidth="2" />
              <line x1="26" y1="28" x2="54" y2="60" stroke={corAcento} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="54" y1="28" x2="26" y2="60" stroke={corAcento} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="40" cy="44" r="9" fill="none" stroke={corAcento} strokeWidth="2" />
            </svg>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", color: corAcento, fontFamily: "var(--font-cinzel, Georgia, serif)" }}>
              {e.nome ?? "GRUPO EXPAND"}
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "#D8AB6E", marginTop: 2 }}>
              {e.tagline ?? "Commercial Growth Advisory"}
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 28px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            {swatch(corPrimaria)}<span style={{ color: "var(--dim)" }}>Primária</span> <code style={{ fontSize: 11, color: "var(--txt)" }}>{corPrimaria}</code>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            {swatch(corAcento)}<span style={{ color: "var(--dim)" }}>Acento</span> <code style={{ fontSize: 11, color: "var(--txt)" }}>{corAcento}</code>
          </div>
          {valores.map((v) => (
            <span key={v} className="ex-pill" style={{ background: `color-mix(in srgb, ${corAcento} 15%, transparent)`, color: corAcento, fontSize: 10 }}>{v}</span>
          ))}
          {e.atualizado_em && (
            <span style={{ fontSize: 10.5, color: "var(--dim)", marginLeft: "auto" }}>
              Atualizado em {new Date(e.atualizado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* Links rápidos */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <a href="https://drive.google.com/drive/folders/1YI_1Z9Et-ImkmzpqJ2hTydblMBs7CT1c" target="_blank" rel="noopener noreferrer"
          className="hx-btn" style={{ fontSize: 12, gap: 6 }}>
          ↗ Identidade visual no Drive
        </a>
        <a href="https://claude.ai/code/artifact/c8eb27df-be5c-4a3c-a6b4-e3684306e032" target="_blank" rel="noopener noreferrer"
          className="hx-btn" style={{ fontSize: 12, gap: 6 }}>
          📄 Template PDF de documentos
        </a>
        {e.manual_url && (
          <a href={e.manual_url} target="_blank" rel="noopener noreferrer" className="hx-btn" style={{ fontSize: 12, gap: 6 }}>
            📖 Manual de Marca
          </a>
        )}
      </div>

      {/* Fundadores */}
      <div style={{ marginBottom: 24 }}>
        <div className="ex-grph"><span className="gt">Fundadores</span><span className="gl" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {fundadores.length > 0 ? fundadores.map((f) => {
            const p = perfis.find((x) => x.id === f.id);
            return (
              <div key={f.id} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                {p?.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(p.foto_url)} alt={f.nome} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-20)", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
                    {f.nome.charAt(0)}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{f.cargo}</div>
                </div>
              </div>
            );
          }) : (
            <p style={{ fontSize: 13, color: "var(--dim)", gridColumn: "1/-1" }}>Nenhum fundador cadastrado.</p>
          )}
        </div>
      </div>

      {/* Formulário de edição (só admin) */}
      {isAdmin ? (
        <form action={salvarEmpresa}>
          <div style={{ display: "grid", gap: 20 }}>

            {/* Identificação */}
            <section className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 14 }}>Identificação</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Nome da empresa</span>
                  <input name="nome" defaultValue={e.nome ?? ""} required style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Tagline</span>
                  <input name="tagline" defaultValue={e.tagline ?? ""} placeholder="Commercial Growth Advisory" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>CNPJ</span>
                  <input name="cnpj" defaultValue={e.cnpj ?? ""} placeholder="00.000.000/0001-00" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Setor</span>
                  <input name="setor" defaultValue={e.setor ?? ""} placeholder="Consultoria comercial…" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1/-1" }}>
                  <span style={lab}>Missão</span>
                  <textarea name="missao" defaultValue={e.missao ?? ""} rows={2} style={{ ...fld, resize: "vertical" }}
                    placeholder="Gerar prosperidade para nossos clientes…" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1/-1" }}>
                  <span style={lab}>Valores (separados por vírgula)</span>
                  <input name="valores" defaultValue={valores.join(", ")} placeholder="Clareza, Tradição, Autoridade, Resultado" style={fld} />
                </label>
              </div>
            </section>

            {/* Identidade Visual */}
            <section className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 14 }}>Identidade Visual</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>URL do Logo (PNG/SVG)</span>
                  <input name="logo_url" defaultValue={e.logo_url ?? ""} placeholder="https://…/logo.png" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>URL do Manual de Marca (PDF)</span>
                  <input name="manual_url" defaultValue={e.manual_url ?? ""} placeholder="https://drive.google.com/…" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Cor primária (fundo escuro)</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" name="cor_primaria" defaultValue={corPrimaria}
                      style={{ width: 40, height: 36, border: "1px solid var(--line-2)", borderRadius: 6, cursor: "pointer", background: "none" }} />
                    <input value={corPrimaria} readOnly style={{ ...fld, fontFamily: "monospace", flex: 1 }} />
                  </div>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Cor de acento (dourado)</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" name="cor_acento" defaultValue={corAcento}
                      style={{ width: 40, height: 36, border: "1px solid var(--line-2)", borderRadius: 6, cursor: "pointer", background: "none" }} />
                    <input value={corAcento} readOnly style={{ ...fld, fontFamily: "monospace", flex: 1 }} />
                  </div>
                </label>
              </div>
            </section>

            {/* Contato */}
            <section className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 14 }}>Contato & Redes</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Site</span>
                  <input name="site" defaultValue={e.site ?? ""} placeholder="https://grupoexpand.com.br" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>E-mail</span>
                  <input name="email" type="email" defaultValue={e.email ?? ""} placeholder="contato@grupoexpand.com.br" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Telefone / WhatsApp</span>
                  <input name="telefone" defaultValue={e.telefone ?? ""} placeholder="+55 11 99999-9999" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Endereço</span>
                  <input name="endereco" defaultValue={e.endereco ?? ""} placeholder="Rua…, cidade – UF" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>Instagram</span>
                  <input name="instagram" defaultValue={e.instagram ?? ""} placeholder="@grupoexpand" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>YouTube</span>
                  <input name="youtube" defaultValue={e.youtube ?? ""} placeholder="youtube.com/@grupoexpand" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={lab}>LinkedIn</span>
                  <input name="linkedin" defaultValue={e.linkedin ?? ""} placeholder="linkedin.com/company/grupoexpand" style={fld} />
                </label>
              </div>
            </section>

            {/* Fundadores (JSON oculto — editado via equipe) */}
            <input type="hidden" name="fundadores_json" value={JSON.stringify(fundadores)} />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "10px 22px", fontSize: 13 }}>
                Salvar configurações
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 18px", fontSize: 13, color: "var(--dim)" }}>
          Apenas administradores podem editar as configurações da empresa.
        </div>
      )}
    </>
  );
}
