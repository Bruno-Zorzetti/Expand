import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AdminNav from "@/components/AdminNav";
import { pipelineDe, RESP_ICON, RESP_LABEL } from "@/lib/pipelines";
import Icon from "@/components/Icon";
import { enviarWhatsapp } from "@/lib/whatsapp";

const ET_STATUS = ["pendente", "andamento", "aprovacao", "concluido"];
const ET_LABEL: Record<string, string> = {
  pendente: "Pendente",
  andamento: "Em andamento",
  aprovacao: "Aguardando cliente",
  concluido: "Concluído",
};

const FLUXO = ["recebido", "confirmado", "pago", "producao", "entregue"];
const STATUS_LABEL: Record<string, string> = {
  recebido: "Recebido",
  confirmado: "Confirmado",
  pago: "Pago",
  producao: "Produção",
  entregue: "Entregue",
};

const LABELS: Record<string, string> = {
  tipo_servico: "Tipo de serviço",
  metodo: "Método de diagnóstico",
  perfil_url: "Link do perfil",
  perfil_nome: "Perfil selecionado",
  conectar_google: "Conectar conta Google",
  cnpj: "CNPJ",
  nome: "Nome da empresa",
  logradouro: "Logradouro",
  numero: "Número",
  bairro: "Bairro",
  cidade: "Cidade",
  uf: "UF",
  cep: "CEP",
  telefone: "Telefone / WhatsApp",
  is_whatsapp: "É WhatsApp",
  tipo_atendimento: "Tipo de atendimento",
  categoria: "Categoria no Google",
  posicionamento: "Posicionamento desejado",
  site: "Site",
  instagram: "Instagram",
  usp: "Diferencial",
  horario: "Horário",
  cnaes: "CNAEs",
};

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
}

function fmtResp(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (v && typeof v === "object") return (v as { nome?: string }).nome ?? "arquivo";
  return String(v ?? "");
}

export default async function PedidoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  const { data: o } = await supabase
    .from("orders")
    .select("id, status, product_slug, dados, created_at, user_id, products(name, category, cockpit)")
    .eq("id", id)
    .single();
  if (!o) notFound();

  const prod = Array.isArray(o.products) ? o.products[0] : o.products;

  const { data: etapasData } = await supabase
    .from("order_etapas")
    .select("id, ordem, nome, responsavel, status")
    .eq("order_id", id)
    .order("ordem");
  const etapas = etapasData ?? [];

  const { data: planoRow } = await supabase
    .from("projeto_plano")
    .select("w2h")
    .eq("order_id", id)
    .maybeSingle();
  const w2h = (planoRow?.w2h ?? {}) as Record<string, string>;

  const { data: briefRow } = await supabase
    .from("briefings")
    .select("respostas, enviado_at")
    .eq("order_id", id)
    .maybeSingle();
  const respostas = (briefRow?.respostas ?? {}) as Record<string, unknown>;
  const { data: defRow } = await supabase
    .from("form_defs")
    .select("campos")
    .eq("slug", o.product_slug)
    .maybeSingle();
  const defCampos = (defRow?.campos ?? []) as { id: string; label: string; tipo: string }[];

  const { data: logsAll } = await supabase
    .from("etapa_logs")
    .select("id, etapa_id, autor, tipo, texto, arquivo_url, created_at")
    .eq("order_id", id)
    .order("created_at");

  async function assinar(p: string | null): Promise<string | null> {
    if (!p) return null;
    if (p.startsWith("http")) return p;
    const { data } = await supabase.storage.from("arquivos").createSignedUrl(p, 3600);
    return data?.signedUrl ?? null;
  }
  const logs = await Promise.all(
    (logsAll ?? []).map(async (l) => ({ ...l, url: await assinar(l.arquivo_url) })),
  );
  const logsDe = (eid: string) => logs.filter((l) => l.etapa_id === eid);
  // arquivos do briefing (campos tipo arquivo) com link assinado
  const arquivosBriefing = await Promise.all(
    defCampos
      .filter((c) => c.tipo === "arquivo" && respostas[c.id])
      .map(async (c) => {
        const v = respostas[c.id] as { path?: string; nome?: string };
        return { label: c.label, nome: v?.nome ?? "arquivo", url: await assinar(v?.path ?? null) };
      }),
  );
  const dados = (o.dados ?? {}) as Record<string, unknown>;
  const entradas = Object.entries(dados).filter(
    ([k]) => !["perfil_url"].includes(k) || dados.perfil_url,
  );

  const perfilUrl = dados.perfil_url as string | undefined;

  async function mudarStatus(formData: FormData) {
    "use server";
    const novo = String(formData.get("status") ?? "");
    if (!FLUXO.includes(novo)) return;
    const supabase = await createClient();
    await supabase.from("orders").update({ status: novo }).eq("id", id);
    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath("/admin");
  }

  async function gerarPlano() {
    "use server";
    const supabase = await createClient();
    const { data: ord } = await supabase
      .from("orders")
      .select("dados, products(name, cockpit, prazo_dias, preco_setup, preco_mensal, price, recorrente)")
      .eq("id", id)
      .single();
    const pr = Array.isArray(ord?.products) ? ord?.products[0] : ord?.products;
    const { data: brief } = await supabase.from("briefings").select("respostas").eq("order_id", id).maybeSingle();
    const { data: diag } = await supabase
      .from("diagnosticos").select("score").eq("order_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const r = (brief?.respostas ?? {}) as Record<string, string>;
    const d = (ord?.dados ?? {}) as Record<string, string>;
    const cockpit = (pr?.cockpit as string) ?? "";
    const AG: Record<string, string> = { gmn: "Léo", leads: "Lara", ebook: "Alan", thumbnail: "Nina" };
    const agente = AG[cockpit] ?? "IA Expand";
    const empresa = r.nome_empresa || r.programa || r.setor || r.mercado || r.nicho || d.negocio || d.nome || d.perfil_nome || "o cliente";
    const foco = r.servico_foco || r.tema || r.objetivo || r.episodio || r.estilo || "";
    const cidade = d.cidade || r.regiao || r.cidade || "";
    const prazo = pr?.prazo_dias ?? 15;
    const preco = pr?.recorrente
      ? `Setup R$${pr?.preco_setup ?? 0} (opcional) + gestão mensal R$${pr?.preco_mensal ?? 0}.`
      : `R$${pr?.price ?? 0}.`;
    const w2h = {
      oque: `Produzir e entregar ${pr?.name ?? "o serviço"} para ${empresa}${foco ? `, com foco em ${foco}` : ""}.`,
      porque:
        cockpit === "gmn" && diag?.score
          ? `Aumentar a visibilidade local e os contatos, subindo o Health Score de ${diag.score}/100 rumo ao TOP 3 do mapa.`
          : "Gerar resultado concreto para o cliente, com qualidade e dentro do prazo.",
      quem: `${agente} (IA) + Equipe Expand (execução e QA) + ${empresa} (aprovações).`,
      onde: cidade || "Digital",
      quando: `Prazo de ${prazo} dias após o briefing${pr?.recorrente ? "; tarefas recorrentes em cadência 7/15/30 dias" : ""}.`,
      como: `Briefing → produção pela IA (${agente}) → curadoria da equipe → aprovação do cliente → entrega.`,
      quanto: preco,
    };
    const squad = [
      { nome: agente, papel: "Produção (IA)" },
      { nome: "Equipe Expand", papel: "Execução e QA" },
      { nome: empresa, papel: "Aprovações" },
    ];
    await supabase.from("projeto_plano").upsert({ order_id: id, w2h, squad, updated_at: new Date().toISOString() });
    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath(`/projeto/${id}`);
  }

  async function salvarPlano(formData: FormData) {
    "use server";
    const campos = ["oque", "porque", "quem", "onde", "quando", "como", "quanto"];
    const w2h: Record<string, string> = {};
    for (const k of campos) w2h[k] = String(formData.get(k) ?? "");
    const supabase = await createClient();
    await supabase.from("projeto_plano").upsert({ order_id: id, w2h, updated_at: new Date().toISOString() });
    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath(`/projeto/${id}`);
  }

  async function gerarEtapas() {
    "use server";
    const supabase = await createClient();
    const { data: ord } = await supabase
      .from("orders")
      .select("id, products(cockpit)")
      .eq("id", id)
      .single();
    const cockpit = (Array.isArray(ord?.products) ? ord?.products[0] : ord?.products)?.cockpit;
    const base = pipelineDe(cockpit);
    const linhas = base.map((e, i) => ({
      order_id: id,
      ordem: i + 1,
      nome: e.nome,
      responsavel: e.responsavel,
      status: i === 0 ? "concluido" : i === 1 ? "andamento" : "pendente",
    }));
    await supabase.from("order_etapas").insert(linhas);
    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath(`/projeto/${id}`);
  }

  async function setEtapa(formData: FormData) {
    "use server";
    const etapaId = String(formData.get("etapa") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!etapaId || !ET_STATUS.includes(status)) return;
    const supabase = await createClient();
    await supabase
      .from("order_etapas")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", etapaId);
    await supabase.from("etapa_logs").insert({
      etapa_id: etapaId,
      order_id: id,
      autor: "Equipe",
      tipo: "sistema",
      texto: `Status alterado para "${ET_LABEL[status]}".`,
    });

    // Notifica o cliente no WhatsApp quando a aprovação dele é necessária
    if (status === "aprovacao") {
      const { data: et } = await supabase.from("order_etapas").select("nome").eq("id", etapaId).maybeSingle();
      const { data: br } = await supabase.from("briefings").select("respostas").eq("order_id", id).maybeSingle();
      const { data: ord } = await supabase.from("orders").select("dados, products(name)").eq("id", id).single();
      const resp = (br?.respostas ?? {}) as Record<string, string>;
      const d = (ord?.dados ?? {}) as Record<string, string>;
      const fone = resp.whatsapp || resp.telefone_fixo || resp.telefone || d.telefone || "";
      const nome = resp.nome_empresa || d.nome || d.perfil_nome || "";
      const prodNome = (Array.isArray(ord?.products) ? ord?.products[0] : ord?.products)?.name ?? "seu projeto";
      if (fone) {
        await enviarWhatsapp(
          fone,
          `Olá${nome ? ` ${nome}` : ""}! Sua aprovação é necessária no projeto *${prodNome}*` +
            `${et?.nome ? ` (${et.nome})` : ""}. Acesse seu painel Hashes para aprovar e seguirmos. 🚀`,
        );
      }
    }

    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath(`/projeto/${id}`);
  }

  async function addLog(formData: FormData) {
    "use server";
    const etapaId = String(formData.get("etapa") ?? "");
    const texto = String(formData.get("texto") ?? "").trim();
    const urlManual = String(formData.get("url") ?? "").trim();
    const arquivo = formData.get("arquivo") as File | null;
    const supabase = await createClient();
    let arquivoUrl: string | null = urlManual || null;
    if (arquivo && arquivo.size > 0) {
      const path = `${id}/entregas/${Date.now()}-${arquivo.name}`;
      const { error } = await supabase.storage.from("arquivos").upload(path, arquivo, { upsert: true });
      if (!error) arquivoUrl = path;
    }
    if (!etapaId || (!texto && !arquivoUrl)) return;
    await supabase.from("etapa_logs").insert({
      etapa_id: etapaId,
      order_id: id,
      autor: "Equipe",
      tipo: arquivoUrl ? "entrega" : "nota",
      texto: texto || "Arquivo entregue.",
      arquivo_url: arquivoUrl,
    });
    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath(`/projeto/${id}`);
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-[#EAF0FA]">
      <AdminNav />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="font-mono text-xs text-[#63708c]">
          #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("pt-BR")}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">{prod?.name ?? o.product_slug}</h1>
        <p className="mt-1 text-sm text-[#8B96AC]">
          {String(dados.nome ?? dados.perfil_nome ?? "Cliente")} ·{" "}
          {String(dados.tipo_servico ?? "—")}
        </p>

        {/* Status / esteira */}
        <div className="mt-6 rounded-2xl border border-[#1E2740] bg-[#0F1626] p-5">
          <p className="mb-3 text-sm font-bold">Status</p>
          <form action={mudarStatus} className="flex flex-wrap gap-2">
            {FLUXO.map((s) => (
              <button
                key={s}
                name="status"
                value={s}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  o.status === s
                    ? "bg-[#2F80FF] text-[#04102b]"
                    : "border border-[#28324c] bg-[#070A12] text-[#8B96AC] hover:border-[#2F80FF]"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </form>
          <p className="mt-3 text-xs text-[#63708c]">
            Clique para mover o pedido pela esteira.
          </p>
        </div>

        {/* Etapas do projeto (visível para o cliente em /projeto/[id]) */}
        <div className="mt-4 rounded-2xl border border-[#1E2740] bg-[#0F1626] p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Etapas do projeto</p>
            <a
              href={`/projeto/${o.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#5AA0FF] hover:underline"
            >
              Ver como o cliente vê →
            </a>
          </div>

          {etapas.length === 0 ? (
            <form action={gerarEtapas}>
              <p className="mb-3 text-xs text-[#63708c]">
                Este pedido ainda não tem etapas. Gere a esteira padrão do produto.
              </p>
              <button className="rounded-lg bg-[#2F80FF] px-4 py-2 text-sm font-bold text-[#04102b] hover:bg-[#5AA0FF]">
                Gerar etapas padrão
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              {etapas.map((e) => (
                <div key={e.id} className="rounded-lg border border-[#28324c] bg-[#070A12] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-[#63708c]">{e.ordem}</span>
                    <span className="text-sm font-semibold">{e.nome}</span>
                    <span className="flex items-center gap-1 text-xs text-[#63708c]">
                      <Icon name={RESP_ICON[e.responsavel]} size={13} /> {RESP_LABEL[e.responsavel]}
                    </span>
                    <form action={setEtapa} className="ml-auto flex flex-wrap gap-1">
                      <input type="hidden" name="etapa" value={e.id} />
                      {ET_STATUS.map((s) => (
                        <button
                          key={s}
                          name="status"
                          value={s}
                          className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                            e.status === s
                              ? "bg-[#2F80FF] text-[#04102b]"
                              : "border border-[#28324c] text-[#8B96AC] hover:border-[#2F80FF]"
                          }`}
                        >
                          {ET_LABEL[s]}
                        </button>
                      ))}
                    </form>
                  </div>
                  {logsDe(e.id).length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-[#1E2740] pt-2">
                      {logsDe(e.id).map((l) => (
                        <div key={l.id} className="text-xs">
                          <span className="text-[#63708c]">
                            {new Date(l.created_at).toLocaleString("pt-BR")} · {l.autor}
                          </span>{" "}
                          <span className="text-[#EAF0FA]">{l.texto}</span>
                          {l.url && (
                            <a href={l.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-[#5AA0FF] hover:underline">
                              [abrir]
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <form action={addLog} className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#1E2740] pt-2">
                    <input type="hidden" name="etapa" value={e.id} />
                    <input name="texto" placeholder="Registrar o que foi feito..." className="min-w-0 flex-1 rounded-md border border-[#28324c] bg-[#0F1626] px-2 py-1.5 text-xs text-[#EAF0FA] outline-none focus:border-[#2F80FF]" />
                    <input type="file" name="arquivo" className="max-w-[190px] text-xs text-[#8B96AC] file:mr-2 file:rounded file:border-0 file:bg-[#1E2740] file:px-2 file:py-1 file:text-xs file:text-[#EAF0FA]" />
                    <button className="rounded-md border border-[#28324c] px-3 py-1.5 text-xs font-bold text-[#5AA0FF] hover:border-[#2F80FF]">
                      Registrar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Briefing do cliente */}
        <div className="mt-4 rounded-2xl border border-[#1E2740] bg-[#0F1626] p-5">
          <p className="mb-3 text-sm font-bold">Briefing do cliente</p>
          {!briefRow?.enviado_at ? (
            <p className="text-xs text-[#63708c]">Briefing detalhado ainda não enviado pelo cliente.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-[#63708c]">
                Enviado em {new Date(briefRow.enviado_at).toLocaleString("pt-BR")}
              </p>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                {defCampos
                  .filter((c) => c.tipo !== "secao" && c.tipo !== "arquivo" && respostas[c.id])
                  .map((c) => (
                    <div key={c.id}>
                      <dt className="text-xs text-[#63708c]">{c.label}</dt>
                      <dd className="break-words text-sm text-[#EAF0FA]">{fmtResp(respostas[c.id])}</dd>
                    </div>
                  ))}
              </dl>
              {arquivosBriefing.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold text-[#8B96AC]">Arquivos enviados</p>
                  <div className="flex flex-wrap gap-2">
                    {arquivosBriefing.map((a, i) =>
                      a.url ? (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[#28324c] px-3 py-1.5 text-xs text-[#5AA0FF] hover:border-[#2F80FF]">
                          {a.label}: {a.nome}
                        </a>
                      ) : (
                        <span key={i} className="text-xs text-[#63708c]">{a.label}: {a.nome}</span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Plano estratégico 5W2H */}
        <div className="mt-4 rounded-2xl border border-[#1E2740] bg-[#0F1626] p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Plano estratégico & tático (5W2H)</p>
            <form action={gerarPlano}>
              <button className="rounded-lg border border-[#28324c] px-3 py-1.5 text-xs font-bold text-[#5AA0FF] hover:border-[#2F80FF]">
                Gerar rascunho automático
              </button>
            </form>
          </div>
          <form action={salvarPlano} className="space-y-3">
            {[
              ["oque", "O quê"],
              ["porque", "Por quê"],
              ["quem", "Quem (squad)"],
              ["onde", "Onde"],
              ["quando", "Quando"],
              ["como", "Como"],
              ["quanto", "Quanto"],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="mb-1 block text-xs font-semibold text-[#8B96AC]">{label}</label>
                <textarea
                  name={k}
                  defaultValue={w2h[k] ?? ""}
                  rows={2}
                  className="w-full rounded-lg border border-[#28324c] bg-[#070A12] px-3 py-2 text-sm text-[#EAF0FA] outline-none focus:border-[#2F80FF]"
                />
              </div>
            ))}
            <button className="rounded-lg bg-[#2F80FF] px-4 py-2 text-sm font-bold text-[#04102b] hover:bg-[#5AA0FF]">
              Salvar plano
            </button>
          </form>
        </div>

        {/* Ações rápidas */}
        {perfilUrl && (
          <a
            href={perfilUrl.startsWith("http") ? perfilUrl : `https://${perfilUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg border border-[#28324c] bg-[#0F1626] px-4 py-2 text-sm font-semibold text-[#5AA0FF] hover:border-[#2F80FF]"
          >
            Abrir perfil no Google →
          </a>
        )}

        {/* Dados do briefing */}
        <div className="mt-6 rounded-2xl border border-[#1E2740] bg-[#0F1626] p-5">
          <p className="mb-4 text-sm font-bold">Briefing do cliente</p>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {entradas.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-[#63708c]">{LABELS[k] ?? k}</dt>
                <dd className="text-sm text-[#EAF0FA] break-words">{fmt(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </main>
  );
}
