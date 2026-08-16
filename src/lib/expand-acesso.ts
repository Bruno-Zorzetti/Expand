import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Acesso = {
  userId: string | null;
  role: string;
  isAdmin: boolean;
  isStaff: boolean;
  membro: string | null;
  cliente: string | null;
  acessos: string[];
  // v2
  clienteIds: string[];
  funcoes: string[];
  mentorAgent: string | null;
  agentsAllowed: string[] | null;
  agentsBlocked: string[];
  tokenLimitDay: number | null;
  tokenLimitMonth: number | null;
  tokensToday: number;
  accessDays: string[];
  accessStart: string | null;
  accessEnd: string | null;
};

export async function getAcesso(): Promise<Acesso> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {
    userId: null, role: "anon", isAdmin: false, isStaff: false,
    membro: null, cliente: null, acessos: [],
    clienteIds: [], funcoes: [], mentorAgent: null, agentsAllowed: null,
    agentsBlocked: [], tokenLimitDay: null, tokenLimitMonth: null, tokensToday: 0,
    accessDays: ["seg","ter","qua","qui","sex"], accessStart: null, accessEnd: null,
  };

  const { data: p } = await supabase
    .from("profiles")
    .select("role, expand_membro, expand_cliente, acessos")
    .eq("id", user.id)
    .single();

  const { data: uc } = await supabase
    .from("expand_user_config")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: ucl } = await supabase
    .from("expand_user_clientes")
    .select("cliente_id")
    .eq("user_id", user.id);

  const { data: uf } = await supabase
    .from("expand_user_funcoes")
    .select("funcao")
    .eq("user_id", user.id);

  const role = (p?.role as string) ?? "pendente";
  return {
    userId: user.id,
    role,
    isAdmin: role === "admin",
    isStaff: role === "admin" || role === "equipe",
    membro: (p?.expand_membro as string | null) ?? null,
    cliente: (p?.expand_cliente as string | null) ?? null,
    acessos: (p?.acessos as string[] | null) ?? [],
    clienteIds: (ucl ?? []).map((r: { cliente_id: string }) => r.cliente_id),
    funcoes: (uf ?? []).map((r: { funcao: string }) => r.funcao),
    mentorAgent: uc?.mentor_agent ?? null,
    agentsAllowed: uc?.agents_allowed ?? null,
    agentsBlocked: uc?.agents_blocked ?? [],
    tokenLimitDay: uc?.token_limit_day ?? null,
    tokenLimitMonth: uc?.token_limit_month ?? null,
    tokensToday: uc?.tokens_today ?? 0,
    accessDays: uc?.access_days ?? ["seg","ter","qua","qui","sex"],
    accessStart: uc?.access_start ?? null,
    accessEnd: uc?.access_end ?? null,
  };
}

export function podeSecao(a: Acesso, secao: string): boolean {
  return a.isAdmin || a.acessos.includes(secao);
}

export function podeAgente(a: Acesso, agentSlug: string): boolean {
  if (a.agentsBlocked.includes(agentSlug)) return false;
  if (a.agentsAllowed === null) return true;
  return a.agentsAllowed.includes(agentSlug);
}

export function dentroDoHorario(a: Acesso): boolean {
  if (!a.accessStart || !a.accessEnd) return true;
  const now = new Date();
  const dia = ["dom","seg","ter","qua","qui","sex","sab"][now.getDay()];
  if (!a.accessDays.includes(dia)) return false;
  const hm = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= hm(a.accessStart) && cur <= hm(a.accessEnd);
}

export async function exigirAdmin(): Promise<Acesso> {
  const a = await getAcesso();
  if (!a.isAdmin) redirect("/expand");
  return a;
}

export async function exigirComercial(): Promise<Acesso> {
  const a = await getAcesso();
  if (!podeSecao(a, "comercial")) redirect("/expand");
  return a;
}

export async function exigirSecao(secao: string): Promise<Acesso> {
  const a = await getAcesso();
  if (!podeSecao(a, secao)) redirect("/expand");
  return a;
}
