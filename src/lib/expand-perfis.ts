export type Exp = { org?: string; periodo?: string; cargo?: string; desc?: string };
export type Form = { inst?: string; ano?: string; curso?: string };

export type Perfil = {
  id: string; tipo: string; nome: string; cargo: string | null; area: string | null; cor: string | null;
  foto_url: string | null; bio: string | null;
  interesses: string[] | null; hard: string[] | null; soft: string[] | null; ferramentas: string[] | null; linguagens: string[] | null;
  experiencia: Exp[] | null; formacao: Form[] | null;
  portfolio_url: string | null; portfolio_label: string | null;
  email: string | null; telefone: string | null; pais: string | null; idade: string | null; aniversario: string | null;
  ranking: string | null; nota: number | null; trabalhos: number | null; ordem: number | null;
  prompt: string | null; memoria: string | null;
  metodologia: string | null; processos: { t: string; passos: string[] }[] | null;
  superior: string | null; chapeus: string[] | null;
  disc: Record<string, number> | null; temperamentos: Record<string, number> | null; comportamental_em: string | null;
  disc_segmento: string | null; temp_segmento: string | null;
  ics_token: string | null;
  instagram: string | null; linkedin: string | null;
};

export const linhas = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function parseExp(s: string): Exp[] {
  return linhas(s).map((l) => { const [org, periodo, cargo, ...d] = l.split("|").map((x) => x.trim()); return { org, periodo, cargo, desc: d.join(" | ") }; });
}
export function parseForm(s: string): Form[] {
  return linhas(s).map((l) => { const [inst, ano, curso] = l.split("|").map((x) => x.trim()); return { inst, ano, curso }; });
}
export const expToText = (a: Exp[] | null) => (a ?? []).map((e) => [e.org, e.periodo, e.cargo, e.desc].filter(Boolean).join(" | ")).join("\n");
export const formToText = (a: Form[] | null) => (a ?? []).map((e) => [e.inst, e.ano, e.curso].filter(Boolean).join(" | ")).join("\n");
