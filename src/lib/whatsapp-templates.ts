import { siteUrl } from "@/lib/site";

export type MsgTipo = "boas_vindas" | "onboarding" | "followup_reuniao" | "relatorio";

export const MSG_VARIAVEIS = [
  { var: "{{nome}}", desc: "Nome do cliente" },
  { var: "{{empresa}}", desc: "Nome da empresa" },
  { var: "{{link_portal}}", desc: "Link do portal do cliente" },
  { var: "{{projeto}}", desc: "Nome do projeto/produto" },
  { var: "{{meet_link}}", desc: "Link da reunião (Google Meet)" },
];

export const MSG_LABELS: Record<MsgTipo, string> = {
  boas_vindas: "Boas-vindas ao grupo",
  onboarding: "Início do projeto",
  followup_reuniao: "Follow-up de reunião (1h)",
  relatorio: "Entrega de relatório",
};

export const MSG_EMOJIS: Record<MsgTipo, string> = {
  boas_vindas: "👋",
  onboarding: "🚀",
  followup_reuniao: "📅",
  relatorio: "📊",
};

// Templates padrão do sistema (usados quando o cliente não tem template customizado)
export const TEMPLATES_PADRAO: Record<MsgTipo, string> = {
  boas_vindas:
    "👋 Olá, *{{nome}}*!\n\n" +
    "Seja muito bem-vindo(a) ao grupo da *Expand*! 🎉\n\n" +
    "Por aqui vamos compartilhar atualizações, tirar dúvidas e alinhar tudo do seu projeto. Qualquer coisa, é só falar.\n\n" +
    "Acesse seu portal: {{link_portal}}",

  onboarding:
    "Olá, *{{nome}}*! 🚀\n\n" +
    "Estamos iniciando o seu projeto e queremos garantir que tudo saia perfeito.\n\n" +
    "Nas próximas semanas vamos: diagnosticar, estruturar e entregar. Você vai acompanhar cada etapa pelo seu portal:\n" +
    "👉 {{link_portal}}\n\n" +
    "Qualquer dúvida ou ideia, pode mandar aqui no grupo!",

  followup_reuniao:
    "Olá, *{{nome}}*! ⏰\n\n" +
    "Nossa reunião começa em *1 hora*.\n\n" +
    "{{meet_link}}\n\n" +
    "Se precisar reagendar, avise aqui no grupo.",

  relatorio:
    "Olá, *{{nome}}*! 📊\n\n" +
    "O relatório do mês está pronto e disponível no seu portal.\n\n" +
    "👉 {{link_portal}}\n\n" +
    "Qualquer dúvida sobre os resultados, estamos à disposição!",
};

export function resolveTemplate(
  template: string,
  ctx: { nome: string; empresa?: string; projeto?: string; portUrl: string; meetLink?: string },
): string {
  const meetPlaceholder = ctx.meetLink
    ? `🔗 *Link de acesso:* ${ctx.meetLink}`
    : "📅 Fique atento ao horário combinado.";
  return template
    .replace(/{{nome}}/g, ctx.nome)
    .replace(/{{empresa}}/g, ctx.empresa ?? ctx.nome)
    .replace(/{{projeto}}/g, ctx.projeto ?? "seu projeto")
    .replace(/{{link_portal}}/g, ctx.portUrl)
    .replace(/{{meet_link}}/g, meetPlaceholder);
}

export function buildMensagem(
  tipo: MsgTipo,
  ctx: { nome: string; portUrl: string; meetLink?: string },
  templateCustom?: string | null,
): string {
  const template = templateCustom?.trim() || TEMPLATES_PADRAO[tipo];
  return resolveTemplate(template, ctx);
}

export function portUrlCliente(id: string): string {
  return `${siteUrl()}/portal/${id}`;
}
