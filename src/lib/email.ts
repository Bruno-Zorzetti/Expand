type EnviarEmailOpts = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

type ResendResponse = { id: string } | { name: string; message: string; statusCode?: number };

export async function enviarEmail(opts: EnviarEmailOpts): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, erro: "RESEND_API_KEY não configurado" };

  const from = opts.from ?? (process.env.RESEND_FROM_EMAIL ?? "noreply@expand.hshs.com.br");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
  });

  const data = (await res.json()) as ResendResponse;
  if (!res.ok || "name" in data) {
    const msg = "message" in data ? data.message : `HTTP ${res.status}`;
    return { ok: false, erro: msg };
  }
  return { ok: true, id: (data as { id: string }).id };
}

// ── Layout base Expand ──────────────────────────────────────────────────────

const LOGO_SVG = `<svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E0BC85"/>
      <stop offset="55%" stop-color="#A07644"/>
      <stop offset="100%" stop-color="#E0BC85"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="41" stroke="url(#lg)" stroke-width="3.4"/>
  <path d="M32 19 L70 74" stroke="url(#lg)" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M69 19 L38 63" stroke="url(#lg)" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M52 53 H88" stroke="url(#lg)" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="34" cy="70" r="7" stroke="url(#lg)" stroke-width="3.4"/>
</svg>`;

function emailBase(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080f0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080f0c;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 28px 0;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="display:inline-table;">
              <tr>
                <td style="vertical-align:middle;padding-right:12px;">${LOGO_SVG}</td>
                <td style="vertical-align:middle;">
                  <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.12em;color:#E0BC85;line-height:1;">EXPAND</div>
                  <div style="font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#6b8a78;margin-top:3px;">Motor de Trabalho</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#0f1a17;border:1px solid #1f3a2e;border-radius:16px;padding:36px 40px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#3d5c4e;line-height:1.7;">
              Expand · Motor de Trabalho<br>
              <a href="https://expand.hshs.com.br" style="color:#4d7a63;text-decoration:none;">expand.hshs.com.br</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin:24px 0 8px;padding:14px 28px;background:linear-gradient(135deg,#D4A02A,#A07644);color:#080f0c;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:0.02em;">${label}</a>`;
}

function divider(): string {
  return `<div style="height:1px;background:#1f3a2e;margin:24px 0;"></div>`;
}

// ── Templates ───────────────────────────────────────────────────────────────

export function emailConviteEquipe(nome: string, link: string): string {
  return emailBase(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e8f0ec;font-family:Georgia,serif;">
      Bem-vindo à equipe
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:#D4A02A;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
      Convite de acesso
    </p>
    <p style="margin:0;font-size:15px;color:#9ab0a3;line-height:1.7;">
      Olá${nome ? `, <strong style="color:#e8f0ec;">${nome}</strong>` : ""}! Você foi convidado para fazer parte da operação da <strong style="color:#6FBF92;">Expand</strong>.
    </p>
    <p style="margin:12px 0 0;font-size:14px;color:#9ab0a3;line-height:1.7;">
      Clique no botão abaixo para criar sua senha e acessar o sistema.
    </p>
    ${ctaButton(link, "Aceitar convite →")}
    ${divider()}
    <p style="margin:0;font-size:12px;color:#4d7a63;line-height:1.6;">
      ⏱ Este link expira em <strong style="color:#6b8a78;">24 horas</strong>.<br>
      Se você não esperava este convite, simplesmente ignore este e-mail.
    </p>
  `);
}

export function emailConviteCliente(nomeCliente: string, link: string, nomeEmpresa?: string): string {
  return emailBase(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e8f0ec;font-family:Georgia,serif;">
      Seu portal está pronto
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:#D4A02A;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
      Acesso ao portal do cliente
    </p>
    <p style="margin:0;font-size:15px;color:#9ab0a3;line-height:1.7;">
      Olá${nomeCliente ? `, <strong style="color:#e8f0ec;">${nomeCliente}</strong>` : ""}! A Expand preparou um portal exclusivo para acompanhar${nomeEmpresa ? ` o projeto da <strong style="color:#6FBF92;">${nomeEmpresa}</strong>` : " seu projeto"} em tempo real.
    </p>
    <p style="margin:12px 0 0;font-size:14px;color:#9ab0a3;line-height:1.7;">
      No seu portal você encontra entregas, relatórios, diagnósticos e pode se comunicar diretamente com a equipe.
    </p>
    ${ctaButton(link, "Acessar meu portal →")}
    ${divider()}
    <p style="margin:0;font-size:12px;color:#4d7a63;line-height:1.6;">
      ⏱ Este link expira em <strong style="color:#6b8a78;">24 horas</strong>.<br>
      Após acessar, use sempre o seu e-mail para entrar.
    </p>
  `);
}

export function emailSenha(link: string, nomeOuEmail?: string): string {
  return emailBase(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e8f0ec;font-family:Georgia,serif;">
      Redefinição de senha
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:#D4A02A;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
      Solicitação de nova senha
    </p>
    <p style="margin:0;font-size:15px;color:#9ab0a3;line-height:1.7;">
      ${nomeOuEmail ? `Olá, <strong style="color:#e8f0ec;">${nomeOuEmail}</strong>! Recebemos` : "Recebemos"} uma solicitação para redefinir a senha da sua conta na plataforma Expand.
    </p>
    <p style="margin:12px 0 0;font-size:14px;color:#9ab0a3;line-height:1.7;">
      Clique no botão abaixo para escolher uma nova senha. Se não foi você, ignore este e-mail — sua senha não será alterada.
    </p>
    ${ctaButton(link, "Redefinir minha senha →")}
    ${divider()}
    <p style="margin:0;font-size:12px;color:#4d7a63;line-height:1.6;">
      ⏱ Este link expira em <strong style="color:#6b8a78;">24 horas</strong>.<br>
      Por segurança, não compartilhe este e-mail com ninguém.
    </p>
  `);
}

export function emailNotificacao(titulo: string, mensagem: string, ctaLabel?: string, ctaHref?: string): string {
  return emailBase(`
    <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#e8f0ec;font-family:Georgia,serif;">
      ${titulo}
    </h2>
    <div style="font-size:14px;color:#9ab0a3;line-height:1.75;">
      ${mensagem}
    </div>
    ${ctaLabel && ctaHref ? ctaButton(ctaHref, ctaLabel) : ""}
    ${divider()}
    <p style="margin:0;font-size:12px;color:#4d7a63;">
      Esta é uma notificação automática da plataforma Expand.
    </p>
  `);
}

// backward compat
export { emailConviteEquipe as emailConvite };
