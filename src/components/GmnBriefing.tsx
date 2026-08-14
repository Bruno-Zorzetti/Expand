"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];
const CATEGORIAS = [
  "Empresa de software","Agência de marketing digital","Serviço de marketing","Designer de sites",
  "Consultor de tecnologia da informação","Loja","Restaurante","Clínica","Consultório odontológico",
  "Salão de beleza","Academia","Escritório de advocacia","Contabilidade","Imobiliária","Oficina mecânica","Pet shop",
];

type Dados = Record<string, unknown>;
type Match = { title?: string; address?: string; url?: string; categoria?: string; nota?: number; avaliacoes?: number };

const bigInput =
  "w-full border-0 border-b-2 border-[var(--line-2)] bg-transparent px-1 py-2 text-xl text-[var(--txt)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--dim)]";
const card =
  "flex w-full items-center gap-3 rounded-xl border-2 border-[var(--line-2)] px-4 py-3.5 text-left text-base hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]";

const ANTERIOR: Record<string, string> = {
  metodo: "tem", uf: "metodo", cidade: "uf", nome: "cidade", resultado: "nome",
  confirmar: "resultado", link: "metodo", conectar: "metodo", cnpj: "tem", criar: "cnpj",
};

export default function GmnBriefing({
  action,
}: {
  productId: string;
  productSlug: string;
  action: (dados: Dados) => Promise<void>;
}) {
  const supabase = createClient();
  const [passo, setPasso] = useState<string>("tem");
  const [metodo, setMetodo] = useState<"buscar" | "link" | "conectar" | "">("");
  const [busca, setBusca] = useState({ uf: "", cidade: "", nome: "" });
  const [cidades, setCidades] = useState<string[]>([]);
  const [resultados, setResultados] = useState<Match[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [f, setF] = useState<Dados>({
    cnpj: "", nome: "", logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "",
    telefone: "", categoria: "Empresa de software", posicionamento: "", site: "", usp: "",
    instagram: "", horario: "Segunda a Sexta, 08:00 às 18:00", cnaes: "", perfil_url: "", perfil_nome: "",
  });
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!busca.uf) return setCidades([]);
    let ativo = true;
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${busca.uf}/municipios?orderBy=nome`)
      .then((r) => r.json())
      .then((arr: { nome: string }[]) => ativo && setCidades(Array.isArray(arr) ? arr.map((m) => m.nome) : []))
      .catch(() => ativo && setCidades([]));
    return () => { ativo = false; };
  }, [busca.uf]);

  function voltar() {
    setMsg(null);
    setPasso((p) => ANTERIOR[p] ?? "tem");
  }

  async function buscarCnpj() {
    setMsg(null);
    setBuscando(true);
    const { data, error } = await supabase.functions.invoke("cnpj-lookup", { body: { cnpj: f.cnpj } });
    setBuscando(false);
    if (error || data?.error) {
      setMsg("Não achei esse CNPJ, mas seguimos — você completa depois.");
      setPasso("criar");
      return;
    }
    setF((s) => ({
      ...s,
      nome: data.nome_fantasia || data.razao_social || s.nome,
      logradouro: data.logradouro || s.logradouro, numero: data.numero || s.numero,
      bairro: data.bairro || s.bairro, cidade: data.cidade || s.cidade, uf: data.uf || s.uf,
      cep: data.cep || s.cep, telefone: data.telefone || s.telefone,
      cnaes: [data.cnae_principal, ...(data.cnaes_secundarios || [])].filter(Boolean).join(", "),
    }));
    setMsg(`Achei: ${data.nome_fantasia || data.razao_social}. Já preenchi o endereço.`);
    setPasso("criar");
  }

  async function buscarPerfil() {
    setMsg(null);
    setResultados(null);
    setBuscando(true);
    const { data, error } = await supabase.functions.invoke("gmn-search", {
      body: { nome: busca.nome, cidade: busca.cidade, uf: busca.uf },
    });
    setBuscando(false);
    if (error || data?.error) {
      setMsg("Não consegui buscar agora. Cole o link do seu perfil.");
      setMetodo("link");
      setPasso("link");
      return;
    }
    const ms: Match[] = data?.matches ?? [];
    setResultados(ms);
    if (ms.length === 0) { setMsg("Não achei com esse nome. Cole o link do seu perfil."); setMetodo("link"); setPasso("link"); }
    else setPasso("resultado");
  }

  function escolherPerfil(m: Match) {
    setF((s) => ({ ...s, perfil_url: m.url ?? "", perfil_nome: m.title ?? "" }));
    setPasso("confirmar");
  }

  async function enviarOtimizar() {
    setEnviando(true);
    await action({ tipo_servico: "otimizacao", metodo, perfil_url: f.perfil_url, perfil_nome: f.perfil_nome, conectar_google: metodo === "conectar" });
  }
  async function enviarCriar() {
    setEnviando(true);
    await action({ ...f, tipo_servico: "criacao" });
  }

  const perguntas: Record<string, string> = {
    tem: "Você já tem um perfil no Google Meu Negócio?",
    metodo: "Como prefere que eu encontre o seu perfil?",
    uf: "Em qual estado fica o seu negócio?",
    cidade: "E em qual cidade?",
    nome: "Qual o nome da empresa no Google?",
    resultado: "Achei estes por perto. Qual é o seu?",
    confirmar: "Tudo certo?",
    link: "Cole o link do seu perfil no Google Maps",
    conectar: "Conecte sua conta Google",
    cnpj: "Vamos criar do zero. Tem CNPJ?",
    criar: "Sobre o seu negócio",
  };

  return (
    <div className="hx-glass overflow-hidden">
      <div className="flex min-h-[46vh] flex-col justify-center px-6 py-10 sm:px-10">
        <div key={passo} className="hx-qin">
          <p className="hx-eyebrow mb-2">Diagnóstico gratuito</p>
          <h2 className="text-2xl font-extrabold sm:text-3xl">{perguntas[passo]}</h2>
          {msg && <p className="mt-2 text-sm text-[var(--mut)]">{msg}</p>}

          <div className="mt-6">
            {passo === "tem" && (
              <div className="space-y-2">
                <button className={card} onClick={() => setPasso("metodo")}>
                  <Icon name="check" size={18} className="text-[var(--accent)]" /> Já tenho perfil
                </button>
                <button className={card} onClick={() => setPasso("cnpj")}>
                  <Icon name="pin" size={18} className="text-[var(--accent)]" /> Ainda não tenho
                </button>
              </div>
            )}

            {passo === "metodo" && (
              <div className="space-y-2">
                <button className={card} onClick={() => { setMetodo("buscar"); setPasso("uf"); }}>
                  <Icon name="target" size={18} className="text-[var(--accent)]" /> Buscar pelo nome <span className="ml-1 rounded-full bg-[color-mix(in_srgb,var(--green)_18%,transparent)] px-2 py-0.5 text-xs font-bold text-[var(--green)]">mais fácil</span>
                </button>
                <button className={card} onClick={() => { setMetodo("link"); setPasso("link"); }}>
                  <Icon name="arrowRight" size={18} className="text-[var(--accent)]" /> Colar o link do meu perfil
                </button>
                <button className={card} onClick={() => { setMetodo("conectar"); setPasso("conectar"); }}>
                  <Icon name="cpu" size={18} className="text-[var(--accent)]" /> Conectar minha conta Google
                </button>
              </div>
            )}

            {passo === "uf" && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {UFS.map((u) => (
                    <button key={u} onClick={() => { setBusca((s) => ({ ...s, uf: u, cidade: "" })); setPasso("cidade"); }} className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${busca.uf === u ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line-2)] hover:border-[var(--accent)]"}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {passo === "cidade" && (
              <div>
                <input autoFocus list="cid-dl" value={busca.cidade} onChange={(e) => setBusca((s) => ({ ...s, cidade: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && busca.cidade && setPasso("nome")} placeholder="Digite a cidade..." className={bigInput} />
                <datalist id="cid-dl">{cidades.map((c) => <option key={c} value={c} />)}</datalist>
                <button disabled={!busca.cidade} onClick={() => setPasso("nome")} className="hx-btn hx-btn-primary mt-5 disabled:opacity-50">OK <Icon name="check" size={15} /></button>
              </div>
            )}

            {passo === "nome" && (
              <div>
                <input autoFocus value={busca.nome} onChange={(e) => setBusca((s) => ({ ...s, nome: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && busca.nome.trim().length >= 2 && buscarPerfil()} placeholder="Ex: Grupo Expand" className={bigInput} />
                <button disabled={buscando || busca.nome.trim().length < 2} onClick={buscarPerfil} className="hx-btn hx-btn-primary mt-5 disabled:opacity-50">
                  {buscando ? "Procurando..." : "Localizar meu perfil"}
                </button>
              </div>
            )}

            {passo === "resultado" && resultados && (
              <div className="space-y-2">
                {resultados.map((m, i) => (
                  <button key={i} onClick={() => escolherPerfil(m)} className={card}>
                    <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{m.title ?? "Perfil"}</span>
                      <span className="block truncate text-xs text-[var(--mut)]">{m.address}</span>
                    </span>
                  </button>
                ))}
                <button onClick={() => { setMetodo("link"); setPasso("link"); }} className="text-sm text-[var(--accent)] hover:underline">
                  Não é nenhum desses
                </button>
              </div>
            )}

            {passo === "confirmar" && (
              <div>
                <p className="text-lg">Vou analisar <b>{String(f.perfil_nome || "o seu perfil")}</b> e montar seu diagnóstico gratuito.</p>
                <button onClick={enviarOtimizar} disabled={enviando} className="hx-btn hx-btn-primary mt-5 disabled:opacity-60">
                  {enviando ? "Analisando..." : "Gerar meu diagnóstico grátis"}
                </button>
              </div>
            )}

            {passo === "link" && (
              <div>
                <input autoFocus value={f.perfil_url as string} onChange={(e) => set("perfil_url", e.target.value)} placeholder="Cole o link do Google Maps" className={bigInput} />
                <button onClick={enviarOtimizar} disabled={enviando || !f.perfil_url} className="hx-btn hx-btn-primary mt-5 disabled:opacity-50">
                  {enviando ? "Analisando..." : "Gerar meu diagnóstico grátis"}
                </button>
              </div>
            )}

            {passo === "conectar" && (
              <div className="space-y-3">
                <p className="text-[var(--mut)]">Você libera o acesso e eu faço um diagnóstico completo. Você aprova cada etapa.</p>
                <button type="button" className="hx-btn hx-btn-ghost">Conectar conta Google</button>
                <button onClick={enviarOtimizar} disabled={enviando} className="hx-btn hx-btn-primary block disabled:opacity-60">
                  {enviando ? "Enviando..." : "Gerar meu diagnóstico grátis"}
                </button>
              </div>
            )}

            {passo === "cnpj" && (
              <div>
                <input autoFocus value={f.cnpj as string} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" className={bigInput} />
                <div className="mt-5 flex items-center gap-3">
                  <button onClick={buscarCnpj} disabled={buscando} className="hx-btn hx-btn-primary disabled:opacity-60">
                    {buscando ? "..." : "Buscar dados"}
                  </button>
                  <button onClick={() => setPasso("criar")} className="text-sm text-[var(--mut)] hover:text-[var(--txt)]">Não tenho CNPJ</button>
                </div>
              </div>
            )}

            {passo === "criar" && (
              <div className="space-y-4">
                <div>
                  <label className="hx-eyebrow">Categoria no Google</label>
                  <select value={f.categoria as string} onChange={(e) => set("categoria", e.target.value)} className="mt-1 w-full rounded-xl border-2 border-[var(--line-2)] bg-transparent px-3 py-2.5 text-base text-[var(--txt)] outline-none focus:border-[var(--accent)]">
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <input value={f.posicionamento as string} onChange={(e) => set("posicionamento", e.target.value)} placeholder="Posicionamento desejado (ex: inteligência artificial)" className={bigInput} />
                <button onClick={enviarCriar} disabled={enviando} className="hx-btn hx-btn-primary disabled:opacity-60">
                  {enviando ? "Enviando..." : "Criar meu perfil"}
                </button>
              </div>
            )}
          </div>

          {passo !== "tem" && (
            <button onClick={voltar} className="mt-6 text-sm text-[var(--mut)] hover:text-[var(--txt)]">← Voltar</button>
          )}
        </div>
      </div>
    </div>
  );
}
