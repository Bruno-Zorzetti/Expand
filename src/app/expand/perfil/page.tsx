import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcesso } from "@/lib/expand-acesso";
import { lerConfig } from "@/lib/system-config";
import PerfilHub from "./PerfilHub";

export const dynamic = "force-dynamic";

// ── Server actions ────────────────────────────────────────────────────────────
async function salvarPerfil(formData: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const sb = await createClient();
  const { data: me } = await sb.from("profiles").select("expand_membro").eq("id", userId).single();
  const slug = String(me?.expand_membro ?? "").trim();
  if (!slug) return;

  const adminSb = createAdminClient();
  if (!adminSb) return;

  await adminSb.from("expand_perfis").update({
    bio:         String(formData.get("bio")       ?? ""),
    foto_url:    String(formData.get("foto_url")   ?? ""),
    hero_url:    String(formData.get("hero_url")   ?? ""),
    whatsapp:    String(formData.get("whatsapp")   ?? ""),
    telefone:    String(formData.get("telefone")   ?? ""),
  }).eq("id", slug);

  revalidatePath("/expand/perfil");
}

async function salvarPrompts(formData: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const sb = await createClient();
  const { data: me } = await sb.from("profiles").select("expand_membro").eq("id", userId).single();
  const slug = String(me?.expand_membro ?? "").trim();
  if (!slug) return;

  const adminSb = createAdminClient();
  if (!adminSb) return;

  await adminSb.from("expand_perfis").update({
    foto_prompt:           String(formData.get("foto_prompt")           ?? ""),
    hero_prompt:           String(formData.get("hero_prompt")           ?? ""),
    hero_prompt_cliente:   String(formData.get("hero_prompt_cliente")   ?? ""),
  }).eq("id", slug);

  revalidatePath("/expand/perfil");
}

async function salvarFolgas(folgas: string[]) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const sb = await createClient();
  const { data: me } = await sb.from("profiles").select("expand_membro").eq("id", userId).single();
  const slug = String(me?.expand_membro ?? "").trim();
  if (!slug) return;
  const adminSb = createAdminClient();
  if (!adminSb) return;
  await adminSb.from("expand_perfis").update({ folgas }).eq("id", slug);
  revalidatePath("/expand/perfil");
}

// ── WhatsApp actions ─────────────────────────────────────────────────────────
async function criarEConectarInstanciaWpp(): Promise<{ qrcode?: string | null; paircode?: string | null; erro?: string }> {
  "use server";
  const { userId, isStaff } = await getAcesso();
  if (!userId || !isStaff) return { erro: "Sem permissão." };

  const sb = await createClient();
  const adminSb = createAdminClient();
  if (!adminSb) return { erro: "Service role não configurado." };

  const [url, adminToken] = await Promise.all([
    lerConfig("UAZAPI_URL"),
    lerConfig("UAZAPI_ADMIN_TOKEN"),
  ]);
  if (!url || !adminToken) return { erro: "Admin Token do WhatsApp não configurado. Peça ao admin para configurar em Integrações." };

  // Verificar se já existe instância para esse usuário
  const { data: existing } = await adminSb.from("expand_whatsapp_instancias")
    .select("id,instance_token,status").eq("user_id", userId).maybeSingle();

  let instanceToken: string;

  if (existing?.instance_token) {
    instanceToken = existing.instance_token;
    await adminSb.from("expand_whatsapp_instancias")
      .update({ status: "connecting" }).eq("user_id", userId);
  } else {
    const instanceName = `exp-${userId.replace(/-/g, "").slice(0, 8)}`;
    try {
      const res = await fetch(`${url}/instance/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", admintoken: adminToken },
        body: JSON.stringify({ name: instanceName }),
      });
      const j = await res.json();
      const inst = (j.instance ?? j) as Record<string, unknown>;
      const token = (inst.token ?? inst.instanceToken ?? inst.apikey ?? inst.hash) as string | undefined;
      if (!token) return { erro: String(j.error ?? j.message ?? "Servidor não retornou token.") };
      instanceToken = token;
      await adminSb.from("expand_whatsapp_instancias").upsert({
        user_id: userId, tipo: "colaborador",
        nome: instanceName, server_url: url,
        instance_token: token, status: "connecting",
      }, { onConflict: "user_id" });
    } catch (e) { return { erro: String((e as Error)?.message ?? e) }; }
  }

  // Connect e obter QR
  try {
    const res = await fetch(`${url}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: instanceToken },
      body: JSON.stringify({}),
    });
    const j = await res.json();
    const inst = j.instance ?? {};
    if (!inst.qrcode && !inst.paircode) {
      const errMsg = j.error ?? j.message ?? null;
      return { erro: errMsg ? `Erro: ${errMsg}` : "Servidor não retornou QR. Tente novamente." };
    }
    return { qrcode: inst.qrcode ?? null, paircode: inst.paircode ?? null };
  } catch (e) { return { erro: String((e as Error)?.message ?? e) }; }
}

async function checarInstanciaWpp(): Promise<{ status: string; number?: string; profileName?: string }> {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return { status: "nao_config" };

  const adminSb = createAdminClient();
  if (!adminSb) return { status: "nao_config" };

  const { data: inst } = await adminSb.from("expand_whatsapp_instancias")
    .select("server_url,instance_token").eq("user_id", userId).maybeSingle();
  if (!inst?.server_url || !inst?.instance_token) return { status: "nao_config" };

  try {
    const res = await fetch(`${inst.server_url}/instance/status`, {
      headers: { token: inst.instance_token }, cache: "no-store",
    });
    const j = await res.json();
    const info = j.instance ?? {};
    const status = info.status ?? "unknown";
    if (status === "connected") {
      await adminSb.from("expand_whatsapp_instancias").update({
        status: "connected",
        numero_conectado: info.owner ?? null,
        profile_name: info.profileName ?? null,
      }).eq("user_id", userId);
    }
    return { status, number: info.owner ?? "", profileName: info.profileName ?? "" };
  } catch { return { status: "erro" }; }
}

async function desconectarInstanciaWpp(): Promise<void> {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;

  const adminSb = createAdminClient();
  if (!adminSb) return;

  const { data: inst } = await adminSb.from("expand_whatsapp_instancias")
    .select("server_url,instance_token").eq("user_id", userId).maybeSingle();
  if (!inst?.server_url || !inst?.instance_token) return;

  try {
    await fetch(`${inst.server_url}/instance/disconnect`, {
      method: "POST", headers: { token: inst.instance_token },
    });
  } catch {}
  await adminSb.from("expand_whatsapp_instancias")
    .update({ status: "disconnected", numero_conectado: null, profile_name: null }).eq("user_id", userId);
  revalidatePath("/expand/perfil");
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function PerfilPage() {
  const { userId } = await getAcesso();
  if (!userId) redirect("/login");

  const sb = await createClient();

  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name, email, role, expand_membro, expand_modulos")
    .eq("id", userId)
    .single();

  const slug = String(profile?.expand_membro ?? "").trim();
  const role = String(profile?.role ?? "pendente");

  type Perfil = {
    id: string; nome: string | null; cargo: string | null;
    area: string | null; bio: string | null;
    foto_url: string | null; hero_url: string | null;
    ics_token: string | null; telefone: string | null; whatsapp: string | null;
    foto_prompt: string | null; hero_prompt: string | null; hero_prompt_cliente: string | null;
    folgas: string[] | null; cor: string | null;
  };

  let perfil: Perfil | null = null;
  if (slug) {
    const { data } = await sb
      .from("expand_perfis")
      .select("id,nome,cargo,area,bio,foto_url,hero_url,ics_token,telefone,whatsapp,foto_prompt,hero_prompt,hero_prompt_cliente,folgas,cor")
      .eq("id", slug)
      .single();
    perfil = data as unknown as Perfil | null;
  }

  const nomeBusca = perfil?.nome ?? profile?.full_name ?? "";

  // Tarefas completas para lista + gráficos (últimos 90 dias)
  const noventa = new Date(Date.now() - 90 * 864e5).toISOString();
  const [{ data: tarefasData }, { data: concluidasData }] = await Promise.all([
    nomeBusca
      ? sb.from("expand_etapas")
          .select("id,titulo,cliente_id,status,sla,data_prevista,area,concluida_em,iniciada_em,criado_em")
          .or(`responsavel_atual.eq.${nomeBusca},responsavel.eq.${nomeBusca}`)
          .order("criado_em", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
    // Tarefas concluídas nos últimos 90 dias para gráficos
    nomeBusca
      ? sb.from("expand_etapas")
          .select("id,concluida_em,criado_em,status")
          .or(`responsavel_atual.eq.${nomeBusca},responsavel.eq.${nomeBusca}`)
          .eq("status", "done")
          .gte("concluida_em", noventa)
          .limit(500)
      : Promise.resolve({ data: [] }),
  ]);

  const tarefas = (tarefasData ?? []) as Array<{
    id: string; titulo: string; cliente_id: string; status: string;
    sla: string | null; data_prevista: string | null; area: string | null;
    concluida_em: string | null; iniciada_em: string | null; criado_em: string;
  }>;

  const concluidas = (concluidasData ?? []) as Array<{ id: string; concluida_em: string | null; criado_em: string; status: string }>;

  // Clientes derivados
  const clienteIds = [...new Set(tarefas.map(t => t.cliente_id).filter(Boolean))];
  const { data: clientesData } = clienteIds.length > 0
    ? await sb.from("expand_clientes").select("id,nome,status").in("id", clienteIds)
    : { data: [] };
  const clientesMap = new Map((clientesData ?? []).map((c: { id: string; nome: string; status: string }) => [c.id, c]));

  // Dados do perfil do equipe para o chat
  const { data: membros } = await sb
    .from("expand_perfis")
    .select("id,nome,cargo,tipo")
    .eq("ativo", true)
    .order("nome");

  const adminSbWpp = createAdminClient();
  const wppInst = adminSbWpp
    ? await adminSbWpp
        .from("expand_whatsapp_instancias")
        .select("status,numero_conectado,profile_name")
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };
  const wppStatus = {
    status: (wppInst.data as { status?: string } | null)?.status ?? "nao_config",
    number: (wppInst.data as { numero_conectado?: string } | null)?.numero_conectado ?? undefined,
    profileName: (wppInst.data as { profile_name?: string } | null)?.profile_name ?? undefined,
  };

  return (
    <PerfilHub
      profile={{ id: userId, email: profile?.email ?? "", role, fullName: profile?.full_name ?? "" }}
      perfil={perfil}
      slug={slug}
      tarefas={tarefas}
      concluidas={concluidas}
      clientesMap={Object.fromEntries(clientesMap)}
      membros={(membros ?? []) as Array<{ id: string; nome: string; cargo: string | null; tipo: string | null }>}
      salvarPerfil={salvarPerfil}
      salvarPrompts={salvarPrompts}
      salvarFolgas={salvarFolgas}
      wppStatus={wppStatus}
      conectarWpp={criarEConectarInstanciaWpp}
      checarWpp={checarInstanciaWpp}
      desconectarWpp={desconectarInstanciaWpp}
    />
  );
}
