import { FASES, MAT_FASE } from "@/lib/expand-esteira";

export type EtapaRow = {
  id: string;
  cliente_id: string;
  ordem: number;
  fase: number;
  titulo: string;
  area: string | null;
  responsavel: string | null;
  agente: string | null;
  sla: string | null;
  gatilho: string | null;
  criterio: string | null;
  qtd_esperada: number;
  aprovacao: string;
  visivel_cliente: boolean;
  marco: boolean;
  depende_de: number | null;
  bloqueado: boolean;
  bloqueio_motivo: string | null;
  duracao_min: number | null;
  chamado: boolean;
  chamado_msg: string | null;
  data_prevista: string | null;
  justificativa: string | null;
  status: string;
  responsavel_atual: string | null;
  iniciada_em: string | null;
  concluida_em: string | null;
};

export type ArquivoRow = {
  id: string;
  etapa_id: string;
  nome: string;
  path: string | null;
  tipo: string;
  url: string | null;
  enviado_por: string | null;
  enviado_em: string | null;
  status: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  obs: string | null;
};

// Tarefas que produzem vários arquivos viram singular + quantidade esperada
const SINGULAR: Record<string, { titulo: string; qtd: number }> = {
  "Desenvolver os 9 roteiros estratégicos": { titulo: "Roteiro estratégico", qtd: 9 },
  "Executar a captação": { titulo: "Vídeo captado", qtd: 9 },
  "Editar e finalizar a primeira versão": { titulo: "Vídeo editado", qtd: 9 },
  "Executar os ajustes solicitados": { titulo: "Vídeo ajustado", qtd: 9 },
  "Redigir legendas e copys de apoio": { titulo: "Legenda / copy", qtd: 9 },
  "Desenvolver a nova remessa de roteiros": { titulo: "Roteiro (nova remessa)", qtd: 9 },
  "Gravação mensal de 8 a 9 novos vídeos": { titulo: "Vídeo captado (mensal)", qtd: 9 },
};

export function faseDoCliente(maturidade: string | null): number {
  return MAT_FASE[maturidade ?? ""] ?? 1;
}

// Gera as instâncias de etapa de um cliente a partir do template, com status pela maturidade.
export function instanciasParaCliente(clienteId: string, maturidade: string | null): Omit<EtapaRow, "id">[] {
  const cf = faseDoCliente(maturidade);
  const now = Date.now();
  const out: Omit<EtapaRow, "id">[] = [];
  let ordem = 0;
  for (const f of FASES) {
    for (const t of f.tasks) {
      ordem++;
      const s = SINGULAR[t.t];
      const status = f.id < cf ? "done" : f.id === cf ? "run" : "idle";
      out.push({
        cliente_id: clienteId,
        ordem,
        fase: f.id,
        titulo: s?.titulo ?? t.t,
        area: t.a,
        responsavel: t.o,
        agente: t.ag ?? null,
        sla: t.sla,
        gatilho: t.g,
        criterio: t.d,
        qtd_esperada: s?.qtd ?? 1,
        aprovacao: "qualquer",
        visivel_cliente: t.cli === 1,
        marco: false,
        depende_de: null,
        bloqueado: false,
        bloqueio_motivo: null,
        duracao_min: null,
        chamado: false,
        chamado_msg: null,
        data_prevista: null,
        justificativa: null,
        status,
        responsavel_atual: status === "idle" ? null : t.o,
        iniciada_em: status === "done" ? new Date(now - 18 * 864e5).toISOString() : status === "run" ? new Date(now - 2 * 864e5).toISOString() : null,
        concluida_em: status === "done" ? new Date(now - 15 * 864e5).toISOString() : null,
      });
    }
  }
  return out;
}

// Linha do processo do produto (expand_prod_etapas) — fonte no banco.
export type ProdEtapaRow = {
  fase_ordem: number;
  ordem: number;
  titulo: string;
  area: string | null;
  responsavel: string | null;
  agente: string | null;
  sla: string | null;
  gatilho: string | null;
  criterio: string | null;
  visivel_cliente: boolean;
  qtd_esperada: number;
  aprovacao: string | null;
  marco?: boolean;
  depende_de?: number | null;
};

// Instancia a esteira de um cliente a partir do processo do PRODUTO (banco),
// com o mesmo status-por-maturidade de instanciasParaCliente.
export function instanciasDeProduto(
  clienteId: string,
  maturidade: string | null,
  prodEtapas: ProdEtapaRow[],
): Omit<EtapaRow, "id">[] {
  const cf = faseDoCliente(maturidade);
  const now = Date.now();
  return [...prodEtapas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((t) => {
      const status = t.fase_ordem < cf ? "done" : t.fase_ordem === cf ? "run" : "idle";
      return {
        cliente_id: clienteId,
        ordem: t.ordem,
        fase: t.fase_ordem,
        titulo: t.titulo,
        area: t.area,
        responsavel: t.responsavel,
        agente: t.agente ?? null,
        sla: t.sla,
        gatilho: t.gatilho,
        criterio: t.criterio,
        qtd_esperada: t.qtd_esperada ?? 1,
        aprovacao: t.aprovacao ?? "qualquer",
        visivel_cliente: !!t.visivel_cliente,
        marco: !!t.marco,
        depende_de: t.depende_de ?? null,
        bloqueado: false,
        bloqueio_motivo: null,
        duracao_min: null,
        chamado: false,
        chamado_msg: null,
        data_prevista: null,
        justificativa: null,
        status,
        responsavel_atual: status === "idle" ? null : t.responsavel,
        iniciada_em: status === "done" ? new Date(now - 18 * 864e5).toISOString() : status === "run" ? new Date(now - 2 * 864e5).toISOString() : null,
        concluida_em: status === "done" ? new Date(now - 15 * 864e5).toISOString() : null,
      };
    });
}

export const APROVACAO_ROTULO: Record<string, string> = {
  cliente: "Cliente aprova", gestor: "Gestor aprova", qualquer: "Cliente ou gestor",
};
export const ARQ_STATUS: Record<string, { l: string; c: string }> = {
  pendente: { l: "Pendente", c: "var(--warn)" },
  aprovado: { l: "Aprovado", c: "var(--green)" },
  ajuste: { l: "Ajuste pedido", c: "var(--red)" },
};
export const ETAPA_STATUS: Record<string, { l: string; c: string }> = {
  idle: { l: "Não iniciada", c: "var(--dim)" },
  run: { l: "Em execução", c: "var(--accent)" },
  done: { l: "Concluída", c: "var(--green)" },
  wait: { l: "Aguardando", c: "var(--warn)" },
  late: { l: "Atrasada", c: "var(--red)" },
};
