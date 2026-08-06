import { createClient } from "@/lib/supabase/server";
import { ARQ_STATUS, type EtapaRow, type ArquivoRow } from "@/lib/expand-tarefas";
import { decidirArquivo } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";
}

export default async function Aprovacoes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cli } = await supabase.from("expand_cliente_publico").select("nome").eq("id", id).single();
  const clienteNome = (cli?.nome as string) ?? "Cliente";

  const { data: etData } = await supabase.from("expand_etapas").select("*").eq("cliente_id", id).eq("visivel_cliente", true).order("ordem");
  const etapas = (etData ?? []) as EtapaRow[];
  const etMap = new Map(etapas.map((e) => [e.id, e]));

  const ids = etapas.map((e) => e.id);
  let arquivos: ArquivoRow[] = [];
  const signed = new Map<string, string>();
  if (ids.length) {
    const { data: arqData } = await supabase.from("expand_arquivos").select("*").in("etapa_id", ids).order("enviado_em", { ascending: false });
    arquivos = (arqData ?? []) as ArquivoRow[];
    for (const a of arquivos) {
      if (a.path) {
        const { data: s } = await supabase.storage.from("expand-entregaveis").createSignedUrl(a.path, 120);
        if (s?.signedUrl) signed.set(a.id, s.signedUrl);
      }
    }
  }

  const pendentes = arquivos.filter((a) => a.status === "pendente");
  const historico = arquivos.filter((a) => a.status !== "pendente");

  return (
    <>
      <div className="ex-hero" style={{ padding: "24px 28px" }}>
        <div className="eb">Aprovações</div>
        <h2>Tudo que precisa do seu aval</h2>
        <p>Aprovar por aqui evita que o feedback se perca no WhatsApp e mantém o cronograma no prazo. Junte os ajustes e responda em até 2 dias.</p>
      </div>

      <div className="ex-panel hx-glass">
        <div className="ph"><span className="pt">Aguardando seu aval</span><span className="pc">{pendentes.length}</span></div>
        {pendentes.length === 0 ? <div className="pb"><span style={{ color: "var(--dim)", fontSize: 12 }}>Nada pendente. Você está em dia. 👍</span></div> : null}
        {pendentes.map((a) => {
          const et = etMap.get(a.etapa_id);
          const url = signed.get(a.id);
          return (
            <div key={a.id} className="ex-arq">
              <div className="an">
                {url ? <a className="ex-file" href={url} target="_blank" rel="noreferrer">{a.nome}</a> : a.nome}
                <div className="am">{et?.titulo} · enviado por {a.enviado_por ?? "Expand"} · {fmt(a.enviado_em)}</div>
              </div>
              <form action={decidirArquivo}>
                <input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={a.etapa_id} />
                <input type="hidden" name="decisao" value="aprovado" /><input type="hidden" name="quem" value={clienteNome} />
                <button className="ex-arqbtn ok" type="submit">Aprovar</button>
              </form>
              <form action={decidirArquivo}>
                <input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={a.etapa_id} />
                <input type="hidden" name="decisao" value="ajuste" /><input type="hidden" name="quem" value={clienteNome} />
                <button className="ex-arqbtn no" type="submit">Pedir ajuste</button>
              </form>
            </div>
          );
        })}
      </div>

      <div className="ex-panel hx-glass" style={{ marginTop: 16 }}>
        <div className="ph"><span className="pt">Histórico</span><span className="pc">{historico.length}</span></div>
        {historico.length === 0 ? <div className="pb"><span style={{ color: "var(--dim)", fontSize: 12 }}>Ainda sem itens no histórico.</span></div> : null}
        {historico.map((a) => {
          const et = etMap.get(a.etapa_id);
          const s = ARQ_STATUS[a.status] ?? ARQ_STATUS.pendente;
          return (
            <div key={a.id} className="ex-arq">
              <div className="an">{a.nome}<div className="am">{et?.titulo} · {s.l.toLowerCase()} por {a.aprovado_por ?? "—"} · {fmt(a.aprovado_em)}</div></div>
              <span className="ex-stat" style={{ background: `color-mix(in srgb, ${s.c} 15%, transparent)`, color: s.c }}>{s.l}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
