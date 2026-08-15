// URL pública do sistema. Ignora valores de localhost (que não funcionam em links
// enviados a clientes) e cai na URL de produção do Vercel, ou num domínio conhecido.
export function siteUrl(): string {
  const s = process.env.NEXT_PUBLIC_SITE_URL;
  if (s && !/localhost|127\.0\.0\.1/.test(s)) return s.replace(/\/$/, "");
  const v = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (v) return `https://${v.replace(/\/$/, "")}`;
  return "https://expand.hshs.com.br";
}
