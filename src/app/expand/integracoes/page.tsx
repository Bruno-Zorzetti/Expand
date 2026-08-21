import { exigirAdmin } from "@/lib/expand-acesso";
import { lerTodasConfigs, salvarConfig } from "@/lib/system-config";
import { createClient as createAuth } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import WhatsAppConnect from "@/components/WhatsAppConnect";
import CriarInstancia from "@/components/CriarInstancia";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

// ── Chaves reconhecidas ──────────────────────────────────────────────────────
type ChaveInfo = {
  key: string;
  label: string;
  hint: string;
  secret: boolean;
  link?: string;
};

const GRUPOS: { nome: string; cor: string; descricao: string; chaves: ChaveInfo[] }[] = [
  {
    nome: "WhatsApp (uazapi)",
    cor: "#25D366",
    descricao: "Notificações, envios automáticos e leitura dos grupos.",
    chaves: [
      { key: "UAZAPI_URL",         label: "URL do servidor",        hint: "Ex: https://free.uazapi.com (ou seu servidor pago)",   secret: false, link: "https://uazapi.com" },
      { key: "UAZAPI_TOKEN",       label: "Instance Token",         hint: "Token da instância gerado ao criar no painel uazapi",  secret: true  },
      { key: "UAZAPI_ADMIN_TOKEN", label: "Admin Token (opcional)", hint: "Necessário apenas para criar novas instâncias",        secret: true  },
    ],
  },
  {
    nome: "Google (Drive & Calendar)",
    cor: "#4285F4",
    descricao: "OAuth para criar pastas no Drive de clientes e sincronizar o Google Calendar da equipe.",
    chaves: [
      { key: "GOOGLE_CLIENT_ID",     label: "Client ID",     hint: "console.cloud.google.com → Credenciais → OAuth 2.0",  secret: false, link: "https://console.cloud.google.com/apis/credentials" },
      { key: "GOOGLE_CLIENT_SECRET", label: "Client Secret", hint: "Gerado junto com o Client ID — manter em segredo",     secret: true,  link: "https://console.cloud.google.com/apis/credentials" },
    ],
  },
  {
    nome: "Anthropic (IA dos agentes)",
    cor: "#C89B5E",
    descricao: "Faz os agentes responderem de verdade no chat e gera resumos.",
    chaves: [
      { key: "ANTHROPIC_API_KEY", label: "API Key", hint: "Começa com sk-ant-...", secret: true, link: "https://console.anthropic.com/settings/keys" },
    ],
  },
  {
    nome: "Apify (leads & inteligência)",
    cor: "#D9A94E",
    descricao: "Scraping de leads, análise de mercado e Google Maps.",
    chaves: [
      { key: "APIFY_TOKEN", label: "API Token", hint: "Encontre em apify.com → Settings → Integrations", secret: true, link: "https://console.apify.com/account/integrations" },
    ],
  },
  {
    nome: "IA de design",
    cor: "#7a5cff",
    descricao: "O Design Master escolhe a ferramenta pelo custo. Plugue as chaves para geração autônoma.",
    chaves: [
      { key: "GEMINI_API_KEY",     label: "Google Gemini / Nano Banana", hint: "Começa com AIza...",  secret: true, link: "https://aistudio.google.com/apikey" },
      { key: "OPENAI_API_KEY",     label: "OpenAI (GPT-Image)",          hint: "Começa com sk-...",   secret: true, link: "https://platform.openai.com/api-keys" },
      { key: "HIGGSFIELD_API_KEY", label: "Higgsfield (arte premium)",    hint: "Chave do painel Higgsfield", secret: true, link: "https://app.higgsfield.ai/settings" },
    ],
  },
  {
    nome: "Ambiente de trabalho",
    cor: "#D4A02A",
    descricao: "Personalização do hub de trabalho da equipe.",
    chaves: [
      { key: "soundcloud_playlist_url", label: "SoundCloud — URL da playlist", hint: "Cole a URL de uma playlist pública do SoundCloud. Ex: https://soundcloud.com/user/sets/playlist-name", secret: false, link: "https://soundcloud.com" },
    ],
  },
  {
    nome: "Infraestrutura",
    cor: "#86C0A6",
    descricao: "Banco, rotinas automáticas e domínio público.",
    chaves: [
      { key: "NEXT_PUBLIC_SITE_URL",      label: "URL pública do sistema", hint: "Ex: https://expand.hshs.com.br",        secret: false },
      { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role",  hint: "Chave secreta — não compartilhe. Painel Supabase → Settings → API", secret: true },
      { key: "CRON_SECRET",               label: "Cron Secret",            hint: "Senha para autenticar as chamadas de rotina automática", secret: true },
    ],
  },
];

// ── Server actions ───────────────────────────────────────────────────────────
async function salvar(formData: FormData) {
  "use server";
  await exigirAdmin();
  const supabase = await createAuth();
  const { data: { user } } = await supabase.auth.getUser();
  const chaves = GRUPOS.flatMap(g => g.chaves.map(c => c.key));
  for (const key of chaves) {
    const val = formData.get(key);
    if (val !== null && String(val).trim() !== "") {
      await salvarConfig(key, String(val).trim(), user?.id);
    }
  }
  revalidatePath("/expand/integracoes");
}

async function desconectarGoogle() {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) return;
  await sb.from("system_config").delete().in("key", [
    "GOOGLE_ACCESS_TOKEN", "GOOGLE_REFRESH_TOKEN", "GOOGLE_USER_EMAIL", "GOOGLE_CONNECTED_AT",
  ]);
  revalidatePath("/expand/integracoes");
}

// ── WhatsApp actions ─────────────────────────────────────────────────────────
async function statusWpp(url: string | null, token: string | null) {
  if (!url || !token) return { status: "nao_config" as const };
  try {
    const res = await fetch(`${url}/instance/status`, { headers: { token }, cache: "no-store" });
    const j   = await res.json();
    const inst = j.instance ?? {};
    return { status: inst.status ?? "unknown", number: inst.owner ?? "", profileName: inst.profileName ?? "" };
  } catch { return { status: "erro" }; }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function Integracoes({ searchParams }: { searchParams: Promise<{ google?: string; msg?: string }> }) {
  await exigirAdmin();

  const { google, msg } = await searchParams;

  const dbConfigs = await lerTodasConfigs();

  const resolve = (key: string): string =>
    process.env[key] || dbConfigs[key] || "";

  // WhatsApp status
  const wppUrl   = resolve("UAZAPI_URL") || null;
  const wppToken = resolve("UAZAPI_TOKEN") || null;
  const wpp = await statusWpp(wppUrl, wppToken);

  // Google OAuth status
  const googleEmail       = dbConfigs["GOOGLE_USER_EMAIL"] || "";
  const googleConnected   = !!googleEmail;
  const googleClientId    = resolve("GOOGLE_CLIENT_ID");
  const googleConnectedAt = dbConfigs["GOOGLE_CONNECTED_AT"] || "";

  // Build OAuth URL if Client ID is available
  const siteUrl = resolve("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
  const googleRedirectUri = `${siteUrl}/api/google/callback`;
  const googleScopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/calendar.readonly",
  ].join(" ");
  const googleOAuthUrl = googleClientId
    ? `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleClientId)}&` +
      `redirect_uri=${encodeURIComponent(googleRedirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(googleScopes)}&` +
      `access_type=offline&` +
      `prompt=consent`
    : null;

  async function conectar() {
    "use server";
    const dbC = await lerTodasConfigs();
    const u   = process.env.UAZAPI_URL   || dbC["UAZAPI_URL"]   || "";
    const t   = process.env.UAZAPI_TOKEN || dbC["UAZAPI_TOKEN"] || "";
    if (!u || !t) return { erro: "Configure a URL e o Instance Token do WhatsApp nesta página." };
    try {
      const res = await fetch(`${u}/instance/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: t },
        body: JSON.stringify({}),
      });
      const j    = await res.json();
      const inst = j.instance ?? {};
      if (!inst.qrcode && !inst.paircode) {
        const errMsg = j.error ?? j.message ?? null;
        return { erro: errMsg ? `Erro: ${errMsg}` : "O servidor não retornou o QR. Verifique se o Instance Token está correto e se a instância não expirou." };
      }
      return { qrcode: inst.qrcode ?? null, paircode: inst.paircode ?? null, status: inst.status ?? "connecting" };
    } catch (e) { return { erro: String((e as Error)?.message ?? e) }; }
  }

  async function checar() {
    "use server";
    const dbC = await lerTodasConfigs();
    const u   = process.env.UAZAPI_URL   || dbC["UAZAPI_URL"]   || "";
    const t   = process.env.UAZAPI_TOKEN || dbC["UAZAPI_TOKEN"] || "";
    return statusWpp(u || null, t || null);
  }

  async function desconectar() {
    "use server";
    const dbC = await lerTodasConfigs();
    const u   = process.env.UAZAPI_URL   || dbC["UAZAPI_URL"]   || "";
    const t   = process.env.UAZAPI_TOKEN || dbC["UAZAPI_TOKEN"] || "";
    if (!u || !t) return;
    try { await fetch(`${u}/instance/disconnect`, { method: "POST", headers: { token: t } }); } catch {}
  }

  async function criarInstancia(_prev: { token?: string; nome?: string; erro?: string } | null, formData: FormData) {
    "use server";
    const dbC  = await lerTodasConfigs();
    const u     = process.env.UAZAPI_URL         || dbC["UAZAPI_URL"]         || "";
    const admin = process.env.UAZAPI_ADMIN_TOKEN || dbC["UAZAPI_ADMIN_TOKEN"] || "";
    if (!u || !admin) return { erro: "Configure a URL e o Admin Token do WhatsApp." };
    const nome = String(formData.get("nome") ?? "").trim() || "expand";
    try {
      const res = await fetch(`${u}/instance/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", admintoken: admin },
        body: JSON.stringify({ name: nome }),
      });
      const j    = await res.json();
      const inst = (j.instance ?? j) as Record<string, unknown>;
      const token = (inst.token ?? inst.instanceToken ?? inst.apikey ?? inst.hash) as string | undefined;
      if (!token) return { erro: String(j.error ?? j.message ?? "O servidor não retornou um token.") };
      return { token, nome };
    } catch (e) { return { erro: String((e as Error)?.message ?? e) }; }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const ok = (key: string) => !!(process.env[key] || dbConfigs[key]);
  const fonte = (key: string): "env" | "bd" | "nenhum" =>
    process.env[key] ? "env" : dbConfigs[key] ? "bd" : "nenhum";

  const INPUT: CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "7px 10px", fontSize: 12.5, width: "100%", outline: "none",
    fontFamily: "monospace",
  };

  const connectedAt = googleConnectedAt
    ? new Date(googleConnectedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <>
      <p className="hx-eyebrow">Configurações · conexões</p>
      <h1 className="ex-h1"><span className="hx-accent-text">Integrações</span></h1>
      <p className="ex-sub">
        Configure chaves e tokens diretamente por aqui. Os valores ficam salvos no banco (criptografia via RLS) e podem ser sobrescritos por variáveis de ambiente no Vercel.
      </p>

      {/* Banners de resultado */}
      {google === "ok" && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)", color: "var(--green)", fontSize: 13, marginBottom: 16 }}>
          Google conectado com sucesso!
        </div>
      )}
      {google === "erro" && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)", color: "var(--red)", fontSize: 13, marginBottom: 16 }}>
          Erro ao conectar o Google{msg ? `: ${decodeURIComponent(msg)}` : "."}
        </div>
      )}

      {/* KPIs */}
      <div className="ex-kpis" style={{ marginBottom: 22 }}>
        {(() => {
          const total   = GRUPOS.flatMap(g => g.chaves).length;
          const prontas = GRUPOS.flatMap(g => g.chaves).filter(c => ok(c.key)).length;
          return (
            <>
              <div className="ex-kpi hx-glass"><div className="lab">Configuradas</div><div className="val hx-accent-text">{prontas}/{total}</div><div className="foot">Chaves presentes</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">WhatsApp</div><div className="val" style={{ fontSize: 15, color: wpp.status === "connected" ? "var(--green)" : "var(--warn)" }}>{wpp.status === "connected" ? "Conectado" : wpp.status === "nao_config" ? "Sem chave" : "Desconectado"}</div><div className="foot">{"number" in wpp && wpp.number ? wpp.number : "escaneie o QR"}</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">Google</div><div className="val" style={{ fontSize: 15, color: googleConnected ? "var(--green)" : "var(--warn)" }}>{googleConnected ? "Conectado" : "Desconectado"}</div><div className="foot">{googleConnected ? googleEmail : "OAuth pendente"}</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">IA dos agentes</div><div className="val" style={{ fontSize: 15, color: ok("ANTHROPIC_API_KEY") ? "var(--green)" : "var(--warn)" }}>{ok("ANTHROPIC_API_KEY") ? "Ativa" : "Falta chave"}</div><div className="foot">Anthropic</div></div>
            </>
          );
        })()}
      </div>

      {/* WhatsApp — conectar por QR */}
      <div className="ex-grph"><span className="gt">WhatsApp via uazapi</span><span className="gc">{wpp.status === "connected" ? "conectado" : "offline"}</span><span className="gl" /></div>
      <div className="ex-panel hx-glass" style={{ padding: 18, marginBottom: 8 }}>
        {wpp.status === "nao_config" ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: "color-mix(in srgb, #25D366 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</span>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--txt)", marginBottom: 4 }}>Sem configuração</p>
              <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, margin: 0 }}>
                Configure <b>UAZAPI_URL</b> e <b>UAZAPI_TOKEN</b> no formulário abaixo e salve. Após salvar, recarregue esta página e o botão de conectar aparece.
              </p>
            </div>
          </div>
        ) : (
          <WhatsAppConnect inicial={wpp} conectar={conectar} checar={checar} desconectar={desconectar} />
        )}
      </div>

      {/* Criar instância */}
      <details className="hx-glass" style={{ borderRadius: 12, marginBottom: 28, borderLeft: "3px solid var(--accent-2)" }}>
        <summary style={{ listStyle: "none", cursor: "pointer", padding: "12px 16px", fontWeight: 700, fontSize: 13 }}>
          ＋ Criar nova instância <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--dim)" }}>· gera um novo número/token no seu servidor uazapi</span>
        </summary>
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--line)" }}>
          <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55, margin: "0 0 12px" }}>
            Usa o <code style={CD}>UAZAPI_ADMIN_TOKEN</code>. No servidor de demonstração <code style={CD}>free.uazapi.com</code> isso é <b style={{ color: "var(--warn)" }}>bloqueado</b> — funciona no seu servidor pago.
          </p>
          <CriarInstancia criar={criarInstancia} />
        </div>
      </details>

      {/* Google — Drive & Calendar */}
      <div className="ex-grph"><span className="gt">Google Drive &amp; Calendar</span><span className="gc">{googleConnected ? "conectado" : "desconectado"}</span><span className="gl" /></div>
      <div className="hx-glass" style={{ borderRadius: 14, padding: "20px 22px", marginBottom: 28, borderLeft: "3px solid #4285F4" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: "color-mix(in srgb, #4285F4 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {googleConnected ? "🟢" : "⚪"}
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            {googleConnected ? (
              <>
                <p style={{ fontSize: 14, fontWeight: 800, color: "var(--txt)", marginBottom: 3 }}>Conectado como {googleEmail}</p>
                {connectedAt && <p style={{ fontSize: 11.5, color: "var(--dim)", marginBottom: 10 }}>Autorizado em {connectedAt}</p>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {[
                    { label: "Google Drive", icon: "📁", color: "#4285F4" },
                    { label: "Google Calendar", icon: "📅", color: "#0F9D58" },
                  ].map(s => (
                    <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color, border: `1px solid color-mix(in srgb, ${s.color} 25%, transparent)` }}>
                      {s.icon} {s.label}
                    </span>
                  ))}
                </div>
                <form action={desconectarGoogle} style={{ display: "inline" }}>
                  <button type="submit" className="hx-btn hx-btn-ghost" style={{ fontSize: 12, padding: "6px 14px", color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 30%, transparent)" }}>
                    Desconectar Google
                  </button>
                </form>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, fontWeight: 800, color: "var(--txt)", marginBottom: 4 }}>Não conectado</p>
                <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, marginBottom: 14 }}>
                  Conecte sua conta Google para que a plataforma possa criar pastas no <b>Drive</b> dos clientes e ler o <b>Google Calendar</b> da equipe. Requer <b>GOOGLE_CLIENT_ID</b> e <b>GOOGLE_CLIENT_SECRET</b> configurados abaixo.
                </p>
                {googleOAuthUrl ? (
                  <a href={googleOAuthUrl} className="hx-btn hx-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 18px", textDecoration: "none" }}>
                    <span style={{ fontSize: 16 }}>🔗</span> Conectar com Google
                  </a>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--warn)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span>⚠️</span> Configure o <b>GOOGLE_CLIENT_ID</b> abaixo e salve para habilitar o botão de conexão.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Instruções de configuração */}
        <details style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <summary style={{ listStyle: "none", cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>
            Como configurar o OAuth Google →
          </summary>
          <ol style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.75, margin: "10px 0 0 0", paddingLeft: 18 }}>
            <li>Acesse <b>console.cloud.google.com</b> → APIs &amp; Serviços → Credenciais</li>
            <li>Clique <b>Criar credenciais → ID do cliente OAuth 2.0 → Aplicativo Web</b></li>
            <li>Em &ldquo;URIs de redirecionamento autorizados&rdquo; adicione: <code style={CD}>{siteUrl}/api/google/callback</code></li>
            <li>Ative as APIs: <b>Google Drive API</b> e <b>Google Calendar API</b></li>
            <li>Copie o Client ID e Client Secret e salve no formulário abaixo</li>
          </ol>
        </details>
      </div>

      {/* Formulário principal de chaves */}
      <div className="ex-grph"><span className="gt">Configurar chaves &amp; tokens</span><span className="gl" /></div>
      <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 14, lineHeight: 1.55 }}>
        Preencha apenas o que quiser alterar. Campos em branco são ignorados. Chaves de ambiente no Vercel (<code style={CD}>Settings → Environment Variables</code>) têm prioridade sobre os valores aqui salvos.
      </p>

      <form action={salvar}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {GRUPOS.map(g => (
            <div key={g.nome} className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px", borderLeft: `3px solid ${g.cor}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800 }}>{g.nome}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 14, lineHeight: 1.5 }}>{g.descricao}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {g.chaves.map(c => {
                  const f      = fonte(c.key);
                  const temVal = ok(c.key);
                  return (
                    <div key={c.key}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--txt)" }}>{c.label}</label>
                        {temVal && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: f === "env" ? "color-mix(in srgb, var(--dim) 15%, transparent)" : "color-mix(in srgb, var(--green) 15%, transparent)", color: f === "env" ? "var(--dim)" : "var(--green)" }}>
                            {f === "env" ? "via Vercel" : "✓ salvo no BD"}
                          </span>
                        )}
                        {!temVal && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "color-mix(in srgb, var(--warn) 15%, transparent)", color: "var(--warn)" }}>
                            não configurado
                          </span>
                        )}
                        {c.link && (
                          <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: "var(--accent)", marginLeft: "auto", textDecoration: "none" }}>
                            Obter chave →
                          </a>
                        )}
                      </div>
                      <input
                        name={c.key}
                        type={c.secret ? "password" : "text"}
                        autoComplete="off"
                        placeholder={temVal ? (c.secret ? "••••••••••••• (já configurado — cole nova para trocar)" : dbConfigs[c.key] || process.env[c.key] || "") : c.hint}
                        style={INPUT}
                      />
                      <p style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 3 }}>{c.hint}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
          <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 13, padding: "9px 22px" }}>
            Salvar configurações
          </button>
          <p style={{ fontSize: 11.5, color: "var(--dim)", margin: 0 }}>
            Os valores ficam no banco e entram em vigor imediatamente. Para persistir após redeploy sem o banco, adicione também no Vercel.
          </p>
        </div>
      </form>

      {/* Aviso de migration */}
      <div className="hx-glass" style={{ borderRadius: 12, padding: "13px 16px", marginTop: 20, borderLeft: "3px solid var(--warn)" }}>
        <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.6, margin: 0 }}>
          <b style={{ color: "var(--warn)" }}>Primeira vez?</b> Execute a migration <code style={CD}>supabase/migrations/20260820_system_config.sql</code> no painel do Supabase (<b>SQL Editor</b>) para habilitar o armazenamento de chaves no banco. Até lá, configure via Vercel → Settings → Environment Variables.
        </p>
      </div>
    </>
  );
}

const CD: CSSProperties = {
  fontFamily: "monospace", fontSize: 11, background: "var(--panel-2)",
  border: "1px solid var(--line)", borderRadius: 6, padding: "2px 7px", color: "var(--accent)",
};
