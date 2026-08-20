import { exigirAdmin } from "@/lib/expand-acesso";
import { lerTodasConfigs, salvarConfig } from "@/lib/system-config";
import { createClient as createAuth } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import WhatsAppConnect from "@/components/WhatsAppConnect";
import CriarInstancia from "@/components/CriarInstancia";

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
      { key: "UAZAPI_URL",         label: "URL do servidor",       hint: "Ex: https://free.uazapi.com (ou seu servidor pago)",   secret: false, link: "https://uazapi.com" },
      { key: "UAZAPI_TOKEN",       label: "Instance Token",        hint: "Token da instância gerado ao criar no painel uazapi",  secret: true  },
      { key: "UAZAPI_ADMIN_TOKEN", label: "Admin Token (opcional)", hint: "Necessário apenas para criar novas instâncias",        secret: true  },
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
    nome: "Infraestrutura",
    cor: "#86C0A6",
    descricao: "Banco, rotinas automáticas e domínio público.",
    chaves: [
      { key: "NEXT_PUBLIC_SITE_URL",     label: "URL pública do sistema",  hint: "Ex: https://expand.hshs.com.br",        secret: false },
      { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role",  hint: "Chave secreta — não compartilhe. Painel Supabase → Settings → API", secret: true },
      { key: "CRON_SECRET",              label: "Cron Secret",             hint: "Senha para autenticar as chamadas de rotina automática", secret: true },
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
export default async function Integracoes() {
  await exigirAdmin();

  // Lê todas as configs do banco (fallback de env vars já está no lerConfig individual)
  const dbConfigs = await lerTodasConfigs();

  // Merge: env var → banco (env var tem prioridade, mas mostramos o que está no banco se env não existe)
  const resolve = (key: string): string =>
    process.env[key] || dbConfigs[key] || "";

  // WhatsApp status
  const wppUrl   = resolve("UAZAPI_URL") || null;
  const wppToken = resolve("UAZAPI_TOKEN") || null;
  const wpp = await statusWpp(wppUrl, wppToken);

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
        const msg = j.error ?? j.message ?? null;
        return { erro: msg ? `Erro: ${msg}` : "O servidor não retornou o QR. Verifique se o Instance Token está correto e se a instância não expirou." };
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

  // ── Helpers de status ────────────────────────────────────────────────────
  const ok = (key: string) => !!(process.env[key] || dbConfigs[key]);
  const fonte = (key: string): "env" | "bd" | "nenhum" =>
    process.env[key] ? "env" : dbConfigs[key] ? "bd" : "nenhum";

  const INPUT: React.CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "7px 10px", fontSize: 12.5, width: "100%", outline: "none",
    fontFamily: "monospace",
  };

  return (
    <>
      <p className="hx-eyebrow">Configurações · conexões</p>
      <h1 className="ex-h1"><span className="hx-accent-text">Integrações</span></h1>
      <p className="ex-sub">
        Configure chaves e tokens diretamente por aqui. Os valores ficam salvos no banco (criptografia via RLS) e podem ser sobrescritos por variáveis de ambiente no Vercel.
      </p>

      {/* KPIs */}
      <div className="ex-kpis" style={{ marginBottom: 22 }}>
        {(() => {
          const total   = GRUPOS.flatMap(g => g.chaves).length;
          const prontas = GRUPOS.flatMap(g => g.chaves).filter(c => ok(c.key)).length;
          return (
            <>
              <div className="ex-kpi hx-glass"><div className="lab">Configuradas</div><div className="val hx-accent-text">{prontas}/{total}</div><div className="foot">Chaves presentes</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">WhatsApp</div><div className="val" style={{ fontSize: 15, color: wpp.status === "connected" ? "var(--green)" : "var(--warn)" }}>{wpp.status === "connected" ? "Conectado" : wpp.status === "nao_config" ? "Sem chave" : "Desconectado"}</div><div className="foot">{"number" in wpp && wpp.number ? wpp.number : "escaneie o QR"}</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">IA dos agentes</div><div className="val" style={{ fontSize: 15, color: ok("ANTHROPIC_API_KEY") ? "var(--green)" : "var(--warn)" }}>{ok("ANTHROPIC_API_KEY") ? "Ativa" : "Falta chave"}</div><div className="foot">Anthropic</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">Fonte</div><div className="val" style={{ fontSize: 13 }}>BD + Env</div><div className="foot">Env tem prioridade</div></div>
            </>
          );
        })()}
      </div>

      {/* WhatsApp — conectar por QR */}
      <div className="ex-grph"><span className="gt">WhatsApp — conectar</span><span className="gc">{wpp.status === "connected" ? "conectado" : "offline"}</span><span className="gl" /></div>
      <div className="ex-panel hx-glass" style={{ padding: 18, marginBottom: 8 }}>
        {wpp.status === "nao_config" ? (
          <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6 }}>
            Configure <b>UAZAPI_URL</b> e <b>UAZAPI_TOKEN</b> no formulário abaixo e salve. Após salvar, recarregue esta página e o botão de conectar aparece.
          </p>
        ) : (
          <WhatsAppConnect inicial={wpp} conectar={conectar} checar={checar} desconectar={desconectar} />
        )}
      </div>

      {/* Criar instância */}
      <details className="hx-glass" style={{ borderRadius: 12, marginBottom: 24, borderLeft: "3px solid var(--accent-2)" }}>
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

      {/* Formulário principal de chaves */}
      <div className="ex-grph"><span className="gt">Configurar chaves & tokens</span><span className="gl" /></div>
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

const CD: React.CSSProperties = {
  fontFamily: "monospace", fontSize: 11, background: "var(--panel-2)",
  border: "1px solid var(--line)", borderRadius: 6, padding: "2px 7px", color: "var(--accent)",
};
