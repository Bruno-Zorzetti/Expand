// URL pública do sistema.
// Prioridade: NEXT_PUBLIC_SITE_URL (env var manual) → VERCEL_PROJECT_PRODUCTION_URL
// (domínio customizado do Vercel, disponível em produção) → fallback hardcoded.
// VERCEL_URL é intencionalmente ignorado: retorna o subdomínio .vercel.app,
// não o domínio customizado, gerando links errados enviados a clientes.
export function siteUrl(): string {
  const s = process.env.NEXT_PUBLIC_SITE_URL;
  if (s && !/localhost|127\.0\.0\.1/.test(s)) return s.replace(/\/$/, "");
  const v = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (v) return `https://${v.replace(/\/$/, "")}`;
  return "https://expand.hshs.com.br";
}
