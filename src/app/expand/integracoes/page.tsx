import Link from "next/link";

const INTEGRACOES: { nome: string; desc: string; status: "ativo" | "config"; cor: string; ini: string; acao?: { label: string; href: string } }[] = [
  { nome: "WhatsApp (uazapi)", desc: "Notificações de passagem de bastão, envio de briefing e conexão por QR.", status: "config", cor: "#6FBF92", ini: "W", acao: { label: "Conectar / ver", href: "/admin/whatsapp" } },
  { nome: "Apify", desc: "Scraping para Prospecção de Leads, Inteligência de Mercado e diagnóstico do Google Meu Negócio.", status: "ativo", cor: "#C89B5E", ini: "A" },
  { nome: "Supabase", desc: "Banco de dados, autenticação e Storage privado dos entregáveis (bucket expand-entregaveis).", status: "ativo", cor: "#86C0A6", ini: "S" },
  { nome: "Google Business Profile", desc: "Diagnóstico e otimização de ficha do Google (agente Léo). Via Apify enquanto a API própria não é aprovada.", status: "config", cor: "#E0BC85", ini: "G" },
];

const ST: Record<string, { l: string; c: string }> = {
  ativo: { l: "Ativo", c: "var(--green)" },
  config: { l: "A configurar", c: "var(--warn)" },
};

export default function Integracoes() {
  return (
    <>
      <p className="hx-eyebrow">Conexões</p>
      <h1 className="ex-h1"><span className="hx-accent-text">Integrações</span></h1>
      <p className="ex-sub">Tudo que a operação da Expand conecta por fora: WhatsApp, dados, banco e as APIs dos produtos. As mesmas integrações da Hashes, dentro do Expand.</p>

      <div className="ex-cards">
        {INTEGRACOES.map((i) => (
          <div key={i.nome} className="ex-cc hx-glass">
            <div className="ex-cch">
              <div className="ex-cci" style={{ background: `color-mix(in srgb, ${i.cor} 18%, transparent)`, color: i.cor }}>{i.ini}</div>
              <div style={{ flex: 1 }}><div className="ex-ccn">{i.nome}</div><div className="ex-ccs">Integração</div></div>
              <span className="ex-pill" style={{ background: `color-mix(in srgb, ${ST[i.status].c} 16%, transparent)`, color: ST[i.status].c }}><i className="ex-dot" />{ST[i.status].l}</span>
            </div>
            <div className="ex-ccb">
              <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5, minHeight: 40 }}>{i.desc}</div>
              {i.acao ? (
                <Link href={i.acao.href} className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12, alignSelf: "flex-start" }}>{i.acao.label} ↗</Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
