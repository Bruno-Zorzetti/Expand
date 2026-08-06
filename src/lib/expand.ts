// Motor de trabalho da Expand — tipos e derivações a partir das tabelas expand_*

export type Perfil = {
  temp?: string; obj?: string; sit?: string; garg?: string;
  crit?: number; resp?: string; passos?: [string, number][]; alerta?: string;
} | null;

export type ClienteRow = {
  id: string;
  nome: string;
  segmento: string | null;
  maturidade: string | null;
  rel: number | null;
  exec: number | null;
  depende_de: string | null;
  pendencia: string | null;
  contrato_tipo: string | null;
  contrato_ini: string | null;
  contrato_dur: number | null;
  ativo: boolean;
  perfil: Perfil;
};

export type Derived = ClienteRow & {
  risco: "churn" | "execucao" | "relacao" | "ok";
  saude: "ok" | "risco" | "atrasado";
  urgencia: "critico" | "atencao" | "normal";
  gap: number;
};

export function derive(c: ClienteRow): Derived {
  const gap = c.exec != null ? (c.rel ?? 0) - c.exec : 0;
  const risco: Derived["risco"] =
    gap >= 4 ? "churn"
    : c.exec != null && c.exec <= 4 ? "execucao"
    : c.rel != null && c.rel <= 5 ? "relacao"
    : "ok";
  const saude: Derived["saude"] =
    risco === "ok" ? "ok"
    : risco === "churn" || (c.exec != null && c.exec <= 3) ? "atrasado"
    : "risco";
  const crit = !!(c.perfil && c.perfil.crit);
  const urgencia: Derived["urgencia"] =
    risco === "churn" || saude === "atrasado" ? "critico"
    : crit ? "atencao" : "normal";
  return { ...c, risco, saude, urgencia, gap };
}

export const MAT_COR: Record<string, string> = {
  "Estruturação": "var(--green)",
  "Validação": "var(--accent-2)",
  "Otimização": "var(--accent)",
  "Escala": "var(--green)",
};

export const RISCO_ROTULO: Record<Derived["risco"], string> = {
  churn: "Risco de churn",
  execucao: "Trava na execução",
  relacao: "Relacionamento frio",
  ok: "Sem alerta",
};

// Cores dos agentes (paleta Expand) por slug
export const AG_COR: Record<string, string> = {
  lara: "#E0BC85",
  sofia: "#86C0A6",
  alan: "#E6D0A8",
  nina: "#5FA37E",
};

// Mapeia o campo "Depende de Quem?" do cliente para os donos internos (ids de expand_equipe)
export const DEP_DONO: Record<string, string[]> = {
  "Cliente": [],
  "Audiovisual": ["gabriel"],
  "Gestor de Tráfego": ["ana"],
  "PM, CS": ["ana", "adriane"],
  "CS": ["adriane"],
  "Marketing": ["ana"],
  "Diretoria": ["pedro"],
};

// Contas de uma pessoa: as que dependem dela + (para PM/CS) as que estão esperando o cliente.
export function contasDe(pessoaId: string, clientes: Derived[]) {
  const minhas = clientes.filter((c) => (DEP_DONO[c.depende_de ?? ""] ?? []).includes(pessoaId));
  const esperando = pessoaId === "ana" || pessoaId === "adriane"
    ? clientes.filter((c) => c.depende_de === "Cliente")
    : [];
  return { minhas, esperando };
}

export type AgenteRow = {
  slug: string;
  nome: string;
  papel: string;
  especialidade: string | null;
  aprovador: string | null;
  etapas: number[] | null;
};
