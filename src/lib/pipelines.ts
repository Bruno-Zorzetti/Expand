// Pipelines padrão por cockpit. responsavel: cliente | ia | equipe
export type EtapaBase = { nome: string; responsavel: "cliente" | "ia" | "equipe" };

export const PIPELINES: Record<string, EtapaBase[]> = {
  // Fluxo real GMN: o prazo de entrega só começa a contar após o "Briefing detalhado".
  gmn: [
    { nome: "Diagnóstico gratuito", responsavel: "ia" },
    { nome: "Contratação", responsavel: "equipe" },
    { nome: "Onboarding com a equipe", responsavel: "equipe" },
    { nome: "Contrato assinado", responsavel: "cliente" },
    { nome: "Briefing detalhado (inicia o prazo)", responsavel: "cliente" },
    { nome: "Plano de otimização", responsavel: "ia" },
    { nome: "Aprovação do plano", responsavel: "cliente" },
    { nome: "Configuração / otimização do perfil", responsavel: "equipe" },
    { nome: "Gestão recorrente: posts, avaliações e crescimento", responsavel: "equipe" },
  ],
  ebook: [
    { nome: "Briefing recebido", responsavel: "cliente" },
    { nome: "Estrutura / outline", responsavel: "ia" },
    { nome: "Redação dos capítulos", responsavel: "ia" },
    { nome: "Design (capa + miolo)", responsavel: "ia" },
    { nome: "Landing page + copy", responsavel: "ia" },
    { nome: "Revisão e QA", responsavel: "equipe" },
    { nome: "Aprovação final", responsavel: "cliente" },
    { nome: "Entrega dos arquivos", responsavel: "equipe" },
  ],
  leads: [
    { nome: "Briefing / ICP recebido", responsavel: "cliente" },
    { nome: "Configuração dos filtros", responsavel: "equipe" },
    { nome: "Coleta de dados", responsavel: "ia" },
    { nome: "Higienização (dedup + campos)", responsavel: "ia" },
    { nome: "Revisão amostral", responsavel: "equipe" },
    { nome: "Aprovação e entrega", responsavel: "cliente" },
  ],
  thumbnail: [
    { nome: "Briefing do episódio", responsavel: "cliente" },
    { nome: "Ganchos de título", responsavel: "ia" },
    { nome: "Arte no template", responsavel: "ia" },
    { nome: "Ajuste fino do design", responsavel: "equipe" },
    { nome: "Aprovação", responsavel: "cliente" },
    { nome: "Export e entrega", responsavel: "equipe" },
  ],
};

export const RESP_LABEL: Record<string, string> = {
  cliente: "Você",
  ia: "IA Hashes",
  equipe: "Equipe Hashes",
};
// nomes de ícone (ver components/Icon.tsx) — sem emojis
export const RESP_ICON: Record<string, string> = { cliente: "briefcase", ia: "cpu", equipe: "users" };

export function pipelineDe(cockpit: string | null | undefined): EtapaBase[] {
  return PIPELINES[cockpit ?? ""] ?? PIPELINES.leads;
}
