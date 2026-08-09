import WhatsAppConnect from "@/components/WhatsAppConnect";
import CriarInstancia from "@/components/CriarInstancia";

export const dynamic = "force-dynamic";

const URL_UAZ = process.env.UAZAPI_URL;
const TOKEN = process.env.UAZAPI_TOKEN;

async function statusWpp() {
  if (!URL_UAZ || !TOKEN) return { status: "nao_config" as const };
  try {
    const res = await fetch(`${URL_UAZ}/instance/status`, { headers: { token: TOKEN }, cache: "no-store" });
    const j = await res.json();
    const inst = j.instance ?? {};
    return { status: inst.status ?? "unknown", number: inst.owner ?? "", profileName: inst.profileName ?? "" };
  } catch { return { status: "erro" }; }
}

// integração = nome + para quê + variáveis de ambiente que a ligam
type Integ = { nome: string; cor: string; ini: string; para: string; vars: string[]; ok: boolean };

export default async function Integracoes() {
  const wpp = await statusWpp();
  const integs: Integ[] = [
    { nome: "Anthropic (IA dos agentes)", cor: "#C89B5E", ini: "AI", para: "Faz os agentes responderem de verdade no chat (prompt + RAG).", vars: ["ANTHROPIC_API_KEY"], ok: !!process.env.ANTHROPIC_API_KEY },
    { nome: "WhatsApp (uazapi)", cor: "#6FBF92", ini: "W", para: "Notificações e envios pelo WhatsApp da operação.", vars: ["UAZAPI_URL", "UAZAPI_TOKEN", "UAZAPI_ADMIN_TOKEN", "HASHES_WHATSAPP"], ok: !!(URL_UAZ && TOKEN) },
    { nome: "Supabase", cor: "#86C0A6", ini: "S", para: "Banco, login e Storage dos entregáveis.", vars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
    { nome: "Apify", cor: "#D9A94E", ini: "A", para: "Scraping (leads, inteligência de mercado, GMN).", vars: ["APIFY_TOKEN"], ok: !!process.env.APIFY_TOKEN },
    { nome: "Site (domínio)", cor: "#E0BC85", ini: "@", para: "URL pública usada nos links de calendário (ICS) e e-mails.", vars: ["NEXT_PUBLIC_SITE_URL"], ok: !!process.env.NEXT_PUBLIC_SITE_URL },
  ];

  async function conectar() {
    "use server";
    if (!URL_UAZ || !TOKEN) return { erro: "WhatsApp não configurado (variáveis UAZAPI no Vercel)." };
    try {
      const res = await fetch(`${URL_UAZ}/instance/connect`, { method: "POST", headers: { "Content-Type": "application/json", token: TOKEN }, body: JSON.stringify({}) });
      const j = await res.json(); const inst = j.instance ?? {};
      return { qrcode: inst.qrcode ?? null, paircode: inst.paircode ?? null, status: inst.status ?? (j.connected ? "connected" : "connecting") };
    } catch (e) { return { erro: String((e as Error)?.message ?? e) }; }
  }
  async function checar() { "use server"; return await statusWpp(); }
  async function desconectar() { "use server"; if (!URL_UAZ || !TOKEN) return; try { await fetch(`${URL_UAZ}/instance/disconnect`, { method: "POST", headers: { token: TOKEN } }); } catch {} }

  async function criarInstancia(_prev: { token?: string; nome?: string; erro?: string } | null, formData: FormData) {
    "use server";
    const admin = process.env.UAZAPI_ADMIN_TOKEN;
    if (!URL_UAZ || !admin) return { erro: "Para criar instâncias, defina UAZAPI_URL e UAZAPI_ADMIN_TOKEN (do seu servidor pago) no Vercel." };
    const nome = String(formData.get("nome") ?? "").trim() || "expand";
    try {
      const res = await fetch(`${URL_UAZ}/instance/init`, { method: "POST", headers: { "Content-Type": "application/json", admintoken: admin }, body: JSON.stringify({ name: nome }) });
      const j = await res.json();
      const inst = (j.instance ?? j) as Record<string, unknown>;
      const token = (inst.token ?? inst.instanceToken ?? inst.apikey ?? inst.hash) as string | undefined;
      if (!token) return { erro: String(j.error ?? j.message ?? "O servidor não retornou um token. No servidor de demonstração (free.uazapi.com) criar instância é bloqueado — use seu servidor pago.") };
      return { token, nome };
    } catch (e) { return { erro: String((e as Error)?.message ?? e) }; }
  }

  return (
    <>
      <p className="hx-eyebrow">Configurações · conexões</p>
      <h1 className="ex-h1"><span className="hx-accent-text">Integrações</span></h1>
      <p className="ex-sub">O lugar único de chaves, tokens e acessos. Por segurança, os <b>segredos ficam no Vercel</b> (o servidor lê sem expor a ninguém) — aqui você vê o <b>status de cada um</b> e o <b>nome exato da variável</b> para inserir ou trocar. Onde dá, a conexão é feita direto por aqui (ex.: WhatsApp por QR).</p>

      <div className="ex-kpis" style={{ marginBottom: 18 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Conectadas</div><div className="val hx-accent-text">{integs.filter((i) => i.ok).length}/{integs.length}</div><div className="foot">Chaves presentes</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">WhatsApp</div><div className="val" style={{ fontSize: 15, color: wpp.status === "connected" ? "var(--green)" : "var(--warn)" }}>{wpp.status === "connected" ? "Conectado" : wpp.status === "nao_config" ? "Sem chave" : "Desconectado"}</div><div className="foot">{("number" in wpp && wpp.number) ? wpp.number : "escaneie o QR"}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">IA dos agentes</div><div className="val" style={{ fontSize: 15, color: process.env.ANTHROPIC_API_KEY ? "var(--green)" : "var(--warn)" }}>{process.env.ANTHROPIC_API_KEY ? "Ativa" : "Falta chave"}</div><div className="foot">Anthropic</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Onde inserir</div><div className="val" style={{ fontSize: 15 }}>Vercel</div><div className="foot">Settings · Env Vars</div></div>
      </div>

      {/* WhatsApp — conectar por aqui */}
      <div className="ex-grph"><span className="gt">WhatsApp (uazapi)</span><span className="gc">{wpp.status === "connected" ? "on" : "off"}</span><span className="gl" /></div>
      <div className="ex-panel hx-glass" style={{ padding: 18, marginBottom: 20 }}>
        {wpp.status === "nao_config" ? (
          <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6 }}>
            Adicione no Vercel as variáveis <code style={cd}>UAZAPI_URL</code> = <code style={cd}>https://free.uazapi.com</code> e <code style={cd}>UAZAPI_TOKEN</code> = <code style={cd}>(seu Instance Token)</code>, faça o <b>Redeploy</b> e recarregue aqui — aí aparece o botão de conectar por QR.
          </p>
        ) : (
          <WhatsAppConnect inicial={wpp} conectar={conectar} checar={checar} desconectar={desconectar} />
        )}
      </div>

      {/* Criar nova instância (precisa do Admin Token de um servidor pago) */}
      <details className="hx-glass" style={{ borderRadius: 12, marginBottom: 20, borderLeft: "3px solid var(--accent-2)" }}>
        <summary style={{ listStyle: "none", cursor: "pointer", padding: "12px 16px", fontWeight: 700, fontSize: 13 }}>＋ Criar nova instância <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--dim)" }}>· gera um novo número/token no seu servidor uazapi</span></summary>
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55, margin: "0 0 12px" }}>Usa o <code style={cd}>UAZAPI_ADMIN_TOKEN</code>. No servidor de demonstração <code style={cd}>free.uazapi.com</code> isso é <b style={{ color: "var(--warn)" }}>bloqueado</b> — funciona no seu servidor pago. O token gerado você cola em <code style={cd}>UAZAPI_TOKEN</code> e conecta por QR acima.</p>
          <CriarInstancia criar={criarInstancia} />
        </div>
      </details>

      {/* Mapa de chaves */}
      <div className="ex-grph"><span className="gt">Chaves & tokens</span><span className="gc">{integs.length}</span><span className="gl" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
        {integs.map((i) => (
          <div key={i.nome} className="hx-glass" style={{ borderRadius: 14, padding: "15px 16px", borderLeft: `3px solid ${i.ok ? "var(--green)" : "var(--warn)"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${i.cor} 18%, transparent)`, color: i.cor, fontSize: 13, fontWeight: 800 }}>{i.ini}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{i.nome}</div></div>
              <span className="ex-pill" style={{ background: `color-mix(in srgb, ${i.ok ? "var(--green)" : "var(--warn)"} 16%, transparent)`, color: i.ok ? "var(--green)" : "var(--warn)" }}><i className="ex-dot" />{i.ok ? "Configurada" : "Falta chave"}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5, marginBottom: 10 }}>{i.para}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {i.vars.map((v) => <code key={v} style={cd}>{v}</code>)}
            </div>
          </div>
        ))}
      </div>

      <div className="hx-glass" style={{ borderRadius: 12, padding: "13px 16px", marginTop: 16, borderLeft: "3px solid var(--accent)" }}>
        <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, margin: 0 }}>
          <b style={{ color: "var(--txt)" }}>Como inserir/trocar uma chave:</b> Vercel → projeto <b>expand</b> → <b>Settings → Environment Variables</b> → adicione/edite pelo <b>nome exato</b> acima → <b>Save</b> → <b>Redeploy</b>. Os valores nunca aparecem aqui (segurança); esta tela só mostra se estão presentes e conectados.
        </p>
      </div>
    </>
  );
}

const cd: React.CSSProperties = { fontFamily: "monospace", fontSize: 11, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 7px", color: "var(--accent)" };
