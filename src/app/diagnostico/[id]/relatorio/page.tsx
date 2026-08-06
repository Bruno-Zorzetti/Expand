import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import BotaoImprimir from "@/components/BotaoImprimir";

type Sinal = { key: string; label: string; categoria: "google" | "nos"; status: "ok" | "melhorar"; valor: string; pontos: number; dica: string };
type Conc = { title?: string; reviewsCount?: number; totalScore?: number | null; distanciaKm?: number | null };

export default async function RelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/diagnostico/${id}/relatorio`);

  const { data: diag } = await supabase
    .from("diagnosticos").select("score, dados, created_at").eq("order_id", id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!diag) notFound();

  const d = diag.dados as {
    score: number; sinais: Sinal[]; snapshot: Record<string, unknown>;
    concorrentes?: Conc[]; comparacao?: Record<string, number | null>;
    avaliacoes?: { nota: number | null; qtd: number; diasUltima: number | null; respostaRate: number };
  };
  const snap = d.snapshot ?? {};
  const google = (d.sinais ?? []).filter((s) => s.categoria === "google");
  const nos = (d.sinais ?? []).filter((s) => s.categoria === "nos");
  const potencial = (d.sinais ?? []).filter((s) => s.status === "melhorar").reduce((t, s) => t + s.pontos, 0);
  const cmp = d.comparacao ?? {};
  const av = d.avaliacoes ?? { nota: null, qtd: 0, diasUltima: null, respostaRate: 0 };

  const Lista = ({ titulo, sub, itens }: { titulo: string; sub: string; itens: Sinal[] }) => (
    <section className="mt-6">
      <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
      <p className="mb-2 text-xs text-slate-500">{sub}</p>
      <div className="space-y-1.5">
        {itens.map((s) => (
          <div key={s.key} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2.5">
            <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.status === "ok" ? "bg-emerald-500" : "bg-amber-500"}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {s.label}{" "}
                <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">+{s.pontos}</span>
                <span className={`ml-1 text-xs font-bold ${s.status === "ok" ? "text-emerald-600" : "text-amber-600"}`}>
                  {s.status === "ok" ? "Feito" : "Pode ser melhorado"}
                </span>
              </p>
              {s.status === "melhorar" && <p className="text-xs text-slate-500">{s.dica}</p>}
            </div>
            <span className="text-xs text-slate-400">{s.valor}</span>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <main className="relatorio min-h-screen bg-white text-slate-800">
      <style>{`@media print{.no-print{display:none!important}@page{margin:14mm}.relatorio{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style>
      <div className="no-print sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <span className="text-sm text-slate-500">Pré-visualização do relatório</span>
        <BotaoImprimir />
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-2xl font-black tracking-tight text-slate-900">HASHES</p>
            <p className="text-xs text-slate-500">Diagnóstico Google Meu Negócio · +100 empresas analisadas</p>
          </div>
          <p className="text-xs text-slate-500">{new Date(diag.created_at).toLocaleDateString("pt-BR")}</p>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-extrabold text-slate-900">{String(snap.title ?? "Seu negócio")}</h1>
          <p className="text-sm text-slate-500">{String(snap.categoryName ?? "")} · {String(snap.address ?? "")}</p>
          <div className="mt-4">
            <div className="flex items-end justify-between"><span className="text-sm text-slate-600">Pontuação geral</span><span className="text-3xl font-black text-slate-900">{diag.score}%</span></div>
            <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full" style={{ width: `${Math.max(diag.score, 2)}%`, background: "linear-gradient(90deg,#FF4D4D,#FF8A3D,#FFC24B,#31D0AA,#2F80FF)", backgroundSize: `${(100 / Math.max(diag.score, 1)) * 100}% 100%`, backgroundRepeat: "no-repeat" }} />
            </div>
          </div>
        </div>

        {av.qtd >= 0 && (
          <section className="mt-6 grid grid-cols-4 gap-2 text-center">
            {[["Nota", av.nota ?? "—"], ["Avaliações", av.qtd], ["Fotos", Number(snap.imagesCount ?? 0)], ["Respostas", `${av.respostaRate}%`]].map(([l, v]) => (
              <div key={String(l)} className="rounded-lg bg-slate-50 p-2"><p className="text-lg font-black text-slate-900">{String(v)}</p><p className="text-[10px] text-slate-500">{l}</p></div>
            ))}
          </section>
        )}

        {d.concorrentes && d.concorrentes.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-bold text-slate-900">Você vs. concorrentes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Você tem <b>{Number(cmp.meusReviews ?? 0)}</b> avaliações. A média dos concorrentes é <b>{Number(cmp.mediaReviewsConcorrentes ?? 0)}</b>, e o líder tem <b>{Number(cmp.maxReviewsConcorrente ?? 0)}</b>.
            </p>
          </section>
        )}

        <Lista titulo="O que o Google recomenda" sub="Itens técnicos da plataforma." itens={google} />
        <Lista titulo="O que nós recomendamos" sub="Itens estratégicos, da nossa experiência." itens={nos} />

        <section className="mt-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-sm text-slate-600">Potencial de crescimento identificado</p>
          <p className="text-3xl font-black text-blue-700">+{potencial} pontos</p>
          <p className="mt-2 text-sm text-slate-700">
            Numa reunião consultiva de ~30 minutos, um especialista mostra como aplicar essas melhorias no seu negócio.
          </p>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
          O Health Score é uma metodologia proprietária da Hashes. O Google considera oficialmente relevância, distância e
          proeminência; os itens marcados como recomendação nossa são estimativas baseadas em boas práticas. Este relatório
          não é garantia de posição. Dados públicos coletados do Google Maps em {new Date(diag.created_at).toLocaleDateString("pt-BR")}.
        </footer>
      </div>
    </main>
  );
}
