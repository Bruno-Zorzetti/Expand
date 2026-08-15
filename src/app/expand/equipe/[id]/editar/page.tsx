import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Perfil, linhas, parseExp, parseForm, expToText, formToText } from "@/lib/expand-perfis";

export const dynamic = "force-dynamic";

async function salvar(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === id)) redirect(`/expand/equipe/${id}`);

  const t = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const arr = (k: string) => linhas(String(formData.get(k) ?? ""));
  const nota = String(formData.get("nota") ?? "").trim();
  await supabase.from("expand_perfis").update({
    nome: String(formData.get("nome") ?? "").trim() || "Sem nome",
    cargo: t("cargo"), area: t("area"), cor: t("cor"), foto_url: t("foto_url"), bio: t("bio"),
    interesses: arr("interesses"), hard: arr("hard"), soft: arr("soft"), ferramentas: arr("ferramentas"), linguagens: arr("linguagens"),
    experiencia: parseExp(String(formData.get("experiencia") ?? "")), formacao: parseForm(String(formData.get("formacao") ?? "")),
    portfolio_url: t("portfolio_url"), portfolio_label: t("portfolio_label"),
    email: t("email"), telefone: t("telefone"), pais: t("pais"), idade: t("idade"), aniversario: t("aniversario"),
    instagram: t("instagram"), linkedin: t("linkedin"),
    ranking: t("ranking"), nota: nota ? Number(nota) : null,
    prompt: t("prompt"), memoria: t("memoria"),
    superior: t("superior"), chapeus: arr("chapeus"),
  }).eq("id", id);
  revalidatePath(`/expand/equipe/${id}`);
  revalidatePath("/expand/equipe");
  redirect(`/expand/equipe/${id}`);
}

function F({ n, l, v, tipo }: { n: string; l: string; v?: string | number | null; tipo?: string }) {
  return (<label className="ex-fld"><span>{l}</span><input name={n} type={tipo ?? "text"} defaultValue={v ?? undefined} step={tipo === "number" ? "0.1" : undefined} /></label>);
}
function A({ n, l, v, hint }: { n: string; l: string; v?: string; hint?: string }) {
  return (<label className="ex-fld"><span>{l}{hint ? <em style={{ color: "var(--dim)", fontStyle: "normal", textTransform: "none", letterSpacing: 0 }}> · {hint}</em> : null}</span><textarea name={n} defaultValue={v} /></label>);
}

export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const { data } = await supabase.from("expand_perfis").select("*").eq("id", id).single();
  if (!data) notFound();
  const p = data as Perfil;
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === id)) redirect(`/expand/equipe/${id}`);

  // Acesso: conta vinculada a este perfil
  const { data: contaData } = await supabase.from("profiles")
    .select("id, full_name, email, role")
    .eq("expand_membro", id).maybeSingle();
  const conta = contaData as { id: string; full_name: string | null; email: string | null; role: string } | null;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://expand-hazel.vercel.app";
  const icsUrl = (p as unknown as { ics_token?: string }).ics_token
    ? `${site}/api/calendario/${(p as unknown as { ics_token: string }).ics_token}.ics`
    : null;

  const { data: td } = await supabase.from("expand_perfis").select("id, nome, cargo").order("ordem");
  const todos = (td ?? []) as { id: string; nome: string; cargo: string | null }[];

  return (
    <>
      <Link href={`/expand/equipe/${id}`} className="ex-back">← Voltar ao perfil</Link>
      <p className="hx-eyebrow">Editar perfil</p>
      <h1 className="ex-h1">{p.nome}</h1>
      <p className="ex-sub">Preencha seu portfólio. Listas: um item por linha. Experiência: <span style={{ fontFamily: "monospace" }}>Empresa | Período | Cargo | Descrição</span>. Formação: <span style={{ fontFamily: "monospace" }}>Instituição | Ano | Curso</span>.</p>

      <form action={salvar}>
        <input type="hidden" name="id" defaultValue={p.id} />
        <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
          <div className="ph"><span className="pt">Identidade</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 4 }}>
            <F n="nome" l="Nome" v={p.nome} />
            <F n="cargo" l="Cargo" v={p.cargo} />
            <F n="area" l="Área" v={p.area} />
            <F n="cor" l="Cor" v={p.cor} tipo="color" />
            <F n="foto_url" l="Foto (URL)" v={p.foto_url} />
            <F n="ranking" l="Selo / ranking" v={p.ranking} />
            <F n="nota" l="Nota (0–10)" v={p.nota} tipo="number" />
          </div>
          <div className="pb" style={{ paddingTop: 0 }}><A n="bio" l="Bio / descrição" v={p.bio ?? ""} /></div>
        </div>

        <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
          <div className="ph"><span className="pt">Estrutura no time</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <label className="ex-fld"><span>Responde a (superior)</span>
              <select name="superior" defaultValue={p.superior ?? ""}>
                <option value="">— ninguém (topo)</option>
                {todos.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.nome}{x.cargo ? ` · ${x.cargo}` : ""}</option>)}
              </select>
            </label>
            <A n="chapeus" l="Chapéus / papéis" v={(p.chapeus ?? []).join("\n")} hint="um por linha" />
          </div>
        </div>

        <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
          <div className="ph"><span className="pt">Habilidades</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 4 }}>
            <A n="hard" l="Hard skills" v={(p.hard ?? []).join("\n")} hint="um por linha" />
            <A n="soft" l="Soft skills" v={(p.soft ?? []).join("\n")} hint="um por linha" />
            <A n="ferramentas" l="Ferramentas" v={(p.ferramentas ?? []).join("\n")} hint="um por linha" />
            <A n="linguagens" l="Linguagens" v={(p.linguagens ?? []).join("\n")} hint="um por linha" />
            <A n="interesses" l="Interesses" v={(p.interesses ?? []).join("\n")} hint="um por linha" />
          </div>
        </div>

        <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
          <div className="ph"><span className="pt">Trajetória</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <A n="experiencia" l="Experiência" v={expToText(p.experiencia)} hint="Empresa | Período | Cargo | Descrição" />
            <A n="formacao" l="Formação" v={formToText(p.formacao)} hint="Instituição | Ano | Curso" />
          </div>
        </div>

        <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
          <div className="ph"><span className="pt">Portfólio & contato</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 4 }}>
            <F n="portfolio_url" l="Portfólio (URL)" v={p.portfolio_url} />
            <F n="portfolio_label" l="Portfólio (rótulo)" v={p.portfolio_label} />
            <F n="email" l="E-mail" v={p.email} />
            <F n="telefone" l="WhatsApp" v={p.telefone} />
            <F n="idade" l="Idade" v={p.idade} />
            <F n="aniversario" l="Aniversário" v={p.aniversario} tipo="date" />
            <F n="pais" l="País" v={p.pais} />
            <F n="instagram" l="Instagram (@ ou link)" v={p.instagram} />
            <F n="linkedin" l="LinkedIn (link)" v={p.linkedin} />
          </div>
        </div>

        {p.tipo === "agente" ? (
          <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
            <div className="ph"><span className="pt">Prompt & memória — o que diferencia o agente</span></div>
            <div className="pb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <A n="prompt" l="Prompt / instrução" v={p.prompt ?? ""} hint="o que o agente faz e como" />
              <A n="memoria" l="Memória / base de conhecimento" v={p.memoria ?? ""} hint="referência ao skill em ~/.claude/skills/" />
            </div>
          </div>
        ) : null}

        {/* Seção de Acesso à plataforma — visível para admin ou para o próprio membro */}
        {p.tipo !== "agente" && (
          <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
            <div className="ph"><span className="pt">Acesso à plataforma</span></div>
            <div className="pb" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Status da conta */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: conta ? "var(--green)" : "var(--red)",
                }}/>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--txt)" }}>
                    {conta ? `Conta vinculada — ${conta.full_name || conta.id.slice(0, 8)}` : "Sem conta na plataforma"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)" }}>
                    {conta
                      ? `${conta.email || conta.id.slice(0, 8)} · Papel: ${conta.role}`
                      : `Peça que acesse /login → "Criar conta" → "Sou da equipe" e depois aprove em `}
                    {!conta && <a href="/expand/acessos" style={{ color: "var(--accent)" }}>/expand/acessos</a>}
                  </div>
                </div>
                {me?.role === "admin" && (
                  <a href="/expand/acessos" className="hx-btn hx-btn-ghost" style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12, textDecoration: "none" }}>
                    Gerenciar acesso →
                  </a>
                )}
              </div>

              {/* ICS Calendar URL */}
              {icsUrl ? (
                <div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    Link do calendário (Google Calendar / Apple Calendar / Outlook)
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <code style={{
                      flex: 1, fontSize: 11.5, color: "var(--accent)", background: "var(--bg)",
                      border: "1px solid var(--line-2)", borderRadius: 8, padding: "8px 12px",
                      wordBreak: "break-all", display: "block",
                    }}>
                      {icsUrl}
                    </code>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>
                    Cole este link em "Adicionar por URL" no Google Calendar ou Outlook para sincronizar as tarefas com datas.
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: "var(--dim)" }}>
                  Nenhum token de calendário gerado. Contate o admin para gerar via SQL: <code style={{ fontSize: 11 }}>UPDATE expand_perfis SET ics_token = gen_random_uuid()::text WHERE id = '{id}'</code>
                </p>
              )}
            </div>
          </div>
        )}

        <button className="hx-btn hx-btn-primary" type="submit">Salvar perfil</button>
      </form>
    </>
  );
}
