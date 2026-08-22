// URL pública do sistema.
// Usa NEXT_PUBLIC_SITE_URL (deve ser configurado no Vercel: https://expand.hshs.com.br).
// VERCEL_URL e VERCEL_PROJECT_PRODUCTION_URL são ignorados: retornam o subdomínio
// .vercel.app (ex: expand-hazel.vercel.app), gerando links errados enviados a clientes.
export function siteUrl(): string {
  const s = process.env.NEXT_PUBLIC_SITE_URL;
  if (s) {
    // Strip BOM (﻿) e espaços acidentais que surgem ao copiar/colar no Vercel
    const cleaned = s.replace(/^﻿/, "").trim().replace(/\/$/, "");
    // Rejeita localhost E subdomínios .vercel.app (preview — link errado para clientes)
    if (cleaned && !/localhost|127\.0\.0\.1|\.vercel\.app/.test(cleaned)) return cleaned;
  }
  return "https://expand.hshs.com.br";
}
