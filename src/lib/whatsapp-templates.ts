import { siteUrl } from "@/lib/site";

export type MsgTipo = "boas_vindas" | "onboarding" | "followup_reuniao" | "relatorio";

export function buildMensagem(
  tipo: MsgTipo,
  ctx: { nome: string; portUrl: string; meetLink?: string },
): string {
  const { nome, portUrl, meetLink } = ctx;
  switch (tipo) {
    case "boas_vindas":
      return (
        `👋 Olá, *${nome}*!\n\n` +
        `Seja muito bem-vindo(a) ao grupo da *Expand*! 🎉\n\n` +
        `Por aqui vamos compartilhar atualizações, tirar dúvidas e alinhar tudo do seu projeto. Qualquer coisa, é só falar.\n\n` +
        `Acesse seu portal: ${portUrl}`
      );
    case "onboarding":
      return (
        `Olá, *${nome}*! 🚀\n\n` +
        `Estamos iniciando o seu projeto e queremos garantir que tudo saia perfeito.\n\n` +
        `Nas próximas semanas vamos: diagnosticar, estruturar e entregar. Você vai acompanhar cada etapa pelo seu portal:\n` +
        `👉 ${portUrl}\n\n` +
        `Qualquer dúvida ou ideia, pode mandar aqui no grupo!`
      );
    case "followup_reuniao":
      return (
        `Olá, *${nome}*! ⏰\n\n` +
        `Nossa reunião começa em *1 hora*.\n\n` +
        (meetLink
          ? `🔗 *Link de acesso:* ${meetLink}\n\n`
          : `📅 Fique atento ao horário combinado.\n\n`) +
        `Se precisar reagendar, avise aqui no grupo.`
      );
    case "relatorio":
      return (
        `Olá, *${nome}*! 📊\n\n` +
        `O relatório do mês está pronto e disponível no seu portal.\n\n` +
        `👉 ${portUrl}/resultados\n\n` +
        `Qualquer dúvida sobre os resultados, estamos à disposição!`
      );
  }
}

export function portUrlCliente(id: string): string {
  return `${siteUrl()}/expand/clientes/${id}`;
}
