import Link from 'next/link';

const FERRAMENTAS = [
  {
    href: '/hashes/crm',
    icon: '📲',
    title: 'CRM de Disparos',
    desc: 'Campanhas WhatsApp em massa com IA, lead score e rotação de números',
    color: '#2563eb',
    badge: 'Ativo',
  },
  {
    href: '#',
    icon: '🏢',
    title: 'Clientes',
    desc: 'Gestão da carteira de clientes da Hashes',
    color: '#475569',
    badge: 'Em breve',
  },
  {
    href: '#',
    icon: '📁',
    title: 'Projetos',
    desc: 'Acompanhamento de projetos internos e entregas',
    color: '#475569',
    badge: 'Em breve',
  },
  {
    href: '#',
    icon: '💰',
    title: 'Financeiro',
    desc: 'DRE, custos e receitas da Hashes',
    color: '#475569',
    badge: 'Em breve',
  },
];

export default function HashesAdminPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
          ⚡ Hashes — Painel Interno
        </h1>
        <p style={{ color: '#475569', fontSize: 14, marginTop: 6 }}>
          Ferramentas exclusivas da equipe Hashes
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {FERRAMENTAS.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            style={{ textDecoration: 'none' }}
            aria-disabled={f.href === '#'}
            onClick={f.href === '#' ? (e) => e.preventDefault() : undefined}
          >
            <div style={{
              background: '#0f1623',
              border: `1px solid ${f.href === '#' ? '#1e293b' : '#2563eb33'}`,
              borderRadius: 14,
              padding: '24px 20px',
              cursor: f.href === '#' ? 'not-allowed' : 'pointer',
              opacity: f.href === '#' ? 0.5 : 1,
              transition: 'border-color 0.2s, transform 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{f.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: f.badge === 'Ativo' ? '#172554' : '#1e293b',
                  color: f.badge === 'Ativo' ? '#60a5fa' : '#475569',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {f.badge}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: f.href === '#' ? '#475569' : '#e2e8f0', marginBottom: 6 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
