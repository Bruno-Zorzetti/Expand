import Link from "next/link";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    href: "/expand/ferramentas/grupo",
    icon: "💬",
    title: "Criar grupo WhatsApp",
    desc: "Cria o grupo da conta, adiciona os membros e registra o ID no dossiê do cliente automaticamente.",
    badge: "uazapi",
  },
  {
    href: "/expand/apresentacoes",
    icon: "🎞",
    title: "Apresentações / Slides",
    desc: "Editor de decks com exportação PDF e HTML. Crie propostas, relatórios mensais e guias do cliente.",
    badge: "open-slide",
  },
  {
    href: "/expand/biblioteca",
    icon: "📚",
    title: "Biblioteca de Conhecimento",
    desc: "Metodologia Expand, Playbook 3F, funis e objeções — editável e pesquisável.",
    badge: "RAG",
  },
  {
    href: "/expand/rotinas",
    icon: "⚡",
    title: "Rotinas & Automações",
    desc: "Configure as rotinas automáticas: resumo de grupo, notificações e pipelines agendados.",
    badge: "cron",
  },
  {
    href: "/expand/integracoes",
    icon: "🔗",
    title: "Integrações",
    desc: "Conexões ativas: WhatsApp (uazapi), Drive, Supabase. Configure tokens e webhooks.",
    badge: "config",
  },
  {
    href: "/expand/gestao",
    icon: "🛠",
    title: "Painel Administrativo",
    desc: "KPIs de sistema, fila de aprovações, papéis e health check da plataforma.",
    badge: "admin",
  },
];

export default function FerramentasHub() {
  return (
    <>
      <p className="hx-eyebrow">Admin · Utilitários</p>
      <h1 className="ex-h1">Ferramentas <span className="hx-accent-text">da operação</span></h1>
      <p className="ex-sub">Acesso rápido às ferramentas e integrações que movem a esteira. Tudo aqui é restrito a administradores.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginTop: 22 }}>
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="hx-glass hx-glass-hover"
            style={{ display: "flex", flexDirection: "column", gap: 8, padding: "18px 20px", textDecoration: "none", color: "inherit", borderLeft: "3px solid var(--accent)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.title}</div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", background: "color-mix(in srgb,var(--accent) 14%,transparent)", padding: "2px 7px", borderRadius: 6 }}>{t.badge}</span>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5, margin: 0 }}>{t.desc}</p>
            <span style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 600, marginTop: "auto" }}>Abrir →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
