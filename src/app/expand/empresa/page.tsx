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

export default async function EmpresaPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "identidade";

  const supabase = await createClient();
  const { isAdmin } = await getAcesso();

  const { data } = await supabase.from("expand_empresa_config").select("*").eq("id", "expand").single();
  const e = (data ?? {}) as Partial<Empresa>;

  const fundadores = (Array.isArray(e.fundadores) ? e.fundadores : []) as Fundador[];
  const valores = e.valores ?? ["Clareza", "Tradição", "Autoridade", "Resultado"];
  const corPrimaria = e.cor_primaria ?? "#1B3826";
  const corAcento = e.cor_acento ?? "#C89B5E";

  const { data: ps } = await supabase.from("expand_perfis").select("id, nome, cargo, foto_url, area").eq("tipo", "humano").order("nome");
  const perfis = ps ?? [];

  // For Acessos tab
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, expand_membro")
    .in("role", ["admin", "equipe"])
    .order("full_name");
  const profiles = profilesData ?? [];

  const TABS = [
    { id: "identidade", label: "Identidade" },
    { id: "documentos", label: "Documentos" },
    { id: "ritmo", label: "Ritmo & Rotinas" },
    { id: "acessos", label: "Acessos" },
  ];

  const tabStyle = (id: string): React.CSSProperties => ({
    padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8,
    cursor: "pointer", textDecoration: "none", border: "none",
    background: tab === id ? "var(--accent-20)" : "transparent",
    color: tab === id ? "var(--accent)" : "var(--dim)",
    transition: "background .15s, color .15s",
  });

  return (
    <>
      <p className="hx-eyebrow">Configurações · empresa</p>
      <h1 className="ex-h1" style={{ marginBottom: 6 }}>
        Configurações da <span className="hx-accent-text">empresa</span>
      </h1>
      <p className="ex-sub" style={{ marginBottom: 20 }}>
        Identidade, documentos, ritmo operacional e acessos do Grupo Expand.
      </p>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--line-2)", paddingBottom: 12 }}>
        {TABS.map(t => (
          <a key={t.id} href={`/expand/empresa?tab=${t.id}`} style={tabStyle(t.id)}>{t.label}</a>
        ))}
      </div>

      {/* ── IDENTIDADE ── */}
      {tab === "identidade" && (
        <>
          {/* Preview */}
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

          {/* Form (admin only) */}
          {isAdmin ? (
            <form action={salvarEmpresa}>
              <div style={{ display: "grid", gap: 20 }}>
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
                      <textarea name="missao" defaultValue={e.missao ?? ""} rows={2} style={{ ...fld, resize: "vertical" }} placeholder="Gerar prosperidade para nossos clientes…" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1/-1" }}>
                      <span style={lab}>Valores (separados por vírgula)</span>
                      <input name="valores" defaultValue={valores.join(", ")} placeholder="Clareza, Tradição, Autoridade, Resultado" style={fld} />
                    </label>
                  </div>
                </section>

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
                        <input type="color" name="cor_primaria" defaultValue={corPrimaria} style={{ width: 40, height: 36, border: "1px solid var(--line-2)", borderRadius: 6, cursor: "pointer", background: "none" }} />
                        <input value={corPrimaria} readOnly style={{ ...fld, fontFamily: "monospace", flex: 1 }} />
                      </div>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={lab}>Cor de acento (dourado)</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="color" name="cor_acento" defaultValue={corAcento} style={{ width: 40, height: 36, border: "1px solid var(--line-2)", borderRadius: 6, cursor: "pointer", background: "none" }} />
                        <input value={corAcento} readOnly style={{ ...fld, fontFamily: "monospace", flex: 1 }} />
                      </div>
                    </label>
                  </div>
                </section>

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
      )}

      {/* ── DOCUMENTOS ── */}
      {tab === "documentos" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="ex-grph"><span className="gt">Documentos & Templates</span><span className="gl" /></div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            <a href="https://drive.google.com/drive/folders/1YI_1Z9Et-ImkmzpqJ2hTydblMBs7CT1c" target="_blank" rel="noopener noreferrer"
              className="hx-glass" style={{ borderRadius: 12, padding: "16px 18px", textDecoration: "none", display: "block" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📁</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>Drive — Identidade Visual</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Logos, cores, fontes e assets da marca Expand.</div>
              <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 10 }}>Abrir no Drive →</div>
            </a>

            <a href="https://claude.ai/code/artifact/c8eb27df-be5c-4a3c-a6b4-e3684306e032" target="_blank" rel="noopener noreferrer"
              className="hx-glass" style={{ borderRadius: 12, padding: "16px 18px", textDecoration: "none", display: "block" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>Template PDF</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Template de documentos PDF com identidade visual da Expand.</div>
              <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 10 }}>Abrir template →</div>
            </a>

            {e.manual_url && (
              <a href={e.manual_url} target="_blank" rel="noopener noreferrer"
                className="hx-glass" style={{ borderRadius: 12, padding: "16px 18px", textDecoration: "none", display: "block" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>📖</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>Manual de Marca</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Diretrizes de uso da identidade visual.</div>
                <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 10 }}>Abrir manual →</div>
              </a>
            )}

            <div className="hx-glass" style={{ borderRadius: 12, padding: "16px 18px", opacity: .6 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📝</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>Contrato Padrão</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Template de contrato de prestação de serviços.</div>
              <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 10 }}>Em breve</div>
            </div>

            <div className="hx-glass" style={{ borderRadius: 12, padding: "16px 18px", opacity: .6 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📊</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>Proposta Comercial</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Template de proposta para novos clientes.</div>
              <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 10 }}>Em breve</div>
            </div>

            <div className="hx-glass" style={{ borderRadius: 12, padding: "16px 18px", opacity: .6 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>Relatório Mensal</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Template do relatório de resultados ao cliente.</div>
              <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 10 }}>Em breve</div>
            </div>
          </div>

          {!isAdmin && (
            <p style={{ fontSize: 12.5, color: "var(--dim)", fontStyle: "italic" }}>
              Para adicionar ou editar documentos, fale com o admin.
            </p>
          )}
        </div>
      )}

      {/* ── RITMO & ROTINAS ── */}
      {tab === "ritmo" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="ex-grph"><span className="gt">Ritmo & Rotinas</span><span className="gl" /></div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            <a href="/expand/ritmo" className="hx-glass" style={{ borderRadius: 12, padding: "18px 20px", textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-20)", display: "grid", placeItems: "center", fontSize: 20 }}>🔄</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--txt)" }}>Ritmo Semanal</div>
              </div>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6, margin: 0 }}>
                Rituais fixos da semana — dailies, reviews, retrospectivas. Cadência que mantém a equipe alinhada.
              </p>
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 12 }}>Ver ritmo →</div>
            </a>

            <a href="/expand/rotinas" className="hx-glass" style={{ borderRadius: 12, padding: "18px 20px", textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-20)", display: "grid", placeItems: "center", fontSize: 20 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--txt)" }}>Rotinas Operacionais</div>
              </div>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6, margin: 0 }}>
                Checklists e SOPs de cada área — onboarding de clientes, entrega de relatórios, fechamento comercial.
              </p>
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 12 }}>Ver rotinas →</div>
            </a>

            <a href="/expand/planejamento" className="hx-glass" style={{ borderRadius: 12, padding: "18px 20px", textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-20)", display: "grid", placeItems: "center", fontSize: 20 }}>📅</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--txt)" }}>Planejamento</div>
              </div>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6, margin: 0 }}>
                Agenda semanal, tarefas por cliente e roadmap de entregas. Visão macro e micro da operação.
              </p>
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 12 }}>Ir ao planejamento →</div>
            </a>

            <a href="/expand/v2" className="hx-glass" style={{ borderRadius: 12, padding: "18px 20px", textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-20)", display: "grid", placeItems: "center", fontSize: 20 }}>🎯</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--txt)" }}>Meu Dia</div>
              </div>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6, margin: 0 }}>
                Hub diário de cada membro — tarefas do dia, calendário, notas e acompanhamento de equipe.
              </p>
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 12 }}>Abrir Meu Dia →</div>
            </a>
          </div>
        </div>
      )}

      {/* ── ACESSOS ── */}
      {tab === "acessos" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div className="ex-grph" style={{ marginBottom: 0 }}><span className="gt">Equipe com acesso</span><span className="gl" /></div>
            {isAdmin && (
              <a href="/expand/acessos" className="hx-btn hx-btn-primary" style={{ fontSize: 12 }}>
                Gerenciar acessos →
              </a>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {profiles.map((p) => {
              const membro = perfis.find((x) => x.id === p.expand_membro);
              const ini = ((p.full_name ?? p.email ?? "?")[0] ?? "?").toUpperCase();
              const ROLE_COR: Record<string, string> = { admin: "var(--accent)", equipe: "var(--green)" };
              const ROLE_LABEL: Record<string, string> = { admin: "Admin", equipe: "Equipe" };
              const cor = ROLE_COR[p.role as string] ?? "var(--dim)";
              return (
                <div key={p.id} className="hx-glass" style={{ borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: `color-mix(in srgb, ${cor} 18%, var(--panel-2))`,
                    border: `2px solid ${cor}`,
                    display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, color: cor,
                  }}>{ini}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.full_name ?? p.email}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em",
                        padding: "2px 7px", borderRadius: 20,
                        background: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor,
                      }}>{ROLE_LABEL[p.role as string] ?? p.role}</span>
                      {membro?.cargo && (
                        <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{membro.cargo}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {profiles.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--dim)", fontStyle: "italic" }}>Nenhum membro encontrado.</p>
          )}

          {!isAdmin && (
            <p style={{ fontSize: 12.5, color: "var(--dim)", fontStyle: "italic", marginTop: 8 }}>
              Somente administradores podem adicionar ou remover acessos.
            </p>
          )}
        </div>
      )}
    </>
  );
}
