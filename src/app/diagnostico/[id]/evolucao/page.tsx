import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type Ponto = { score: number; data: string };

function faixaCor(s: number) {
  if (s >= 90) return "#31D0AA";
  if (s >= 70) return "#5AA0FF";
  if (s >= 40) return "#FFC24B";
  return "#FF6B6B";
}

export default async function EvolucaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/diagnostico/${id}/evolucao`);

  const { data: diags } = await supabase
    .from("diagnosticos")
    .select("score, dados, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });
  if (!diags || diags.length === 0) notFound();

  const nome =
    (diags[diags.length - 1]?.dados as { snapshot?: { title?: string } })?.snapshot?.title ??
    "Seu negócio";
  const pontos: Ponto[] = diags.map((d) => ({ score: d.score, data: d.created_at }));
  const atual = pontos[pontos.length - 1].score;
  const primeiro = pontos[0].score;
  const delta = atual - primeiro;

  // ---- Gráfico SVG ----
  const W = 700, H = 240, padL = 38, padR = 20, padT = 20, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const x = (i: number) =>
    padL + (pontos.length === 1 ? plotW / 2 : (plotW * i) / (pontos.length - 1));
  const y = (s: number) => padT + plotH * (1 - s / 100);
  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.score)}`).join(" ");
  const area = `${linha} L ${x(pontos.length - 1)} ${padT + plotH} L ${x(0)} ${padT + plotH} Z`;
  const mes = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <main className="min-h-screen bg-[#070A12] text-[#EAF0FA]">
      <header className="border-b border-[#1E2740]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <span className="font-extrabold tracking-wide">HASHES</span>
          <Link href={`/diagnostico/${id}`} className="text-sm text-[#8B96AC] hover:text-[#EAF0FA]">
            ← Diagnóstico
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#63708c]">
          Evolução do Health Score
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">{nome}</h1>
        <p className="mt-2 text-sm text-[#8B96AC]">
          O Google guarda só 6 meses de histórico. Aqui fica o seu registro completo, mês a mês,
          enquanto você é cliente Hashes.
        </p>

        {/* Resumo */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#1E2740] bg-[#0F1626] p-4 text-center">
            <div className="text-2xl font-extrabold" style={{ color: faixaCor(atual) }}>{atual}</div>
            <div className="text-xs text-[#8B96AC]">Score atual</div>
          </div>
          <div className="rounded-2xl border border-[#1E2740] bg-[#0F1626] p-4 text-center">
            <div className="text-2xl font-extrabold" style={{ color: delta >= 0 ? "#31D0AA" : "#FF6B6B" }}>
              {delta >= 0 ? `+${delta}` : delta}
            </div>
            <div className="text-xs text-[#8B96AC]">Desde o início</div>
          </div>
          <div className="rounded-2xl border border-[#1E2740] bg-[#0F1626] p-4 text-center">
            <div className="text-2xl font-extrabold">{pontos.length}</div>
            <div className="text-xs text-[#8B96AC]">Medições</div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="mt-6 rounded-2xl border border-[#1E2740] bg-[#0F1626] p-5">
          {pontos.length === 1 ? (
            <p className="py-8 text-center text-sm text-[#8B96AC]">
              Esta é a sua primeira medição (score {atual}). A partir do próximo mês, a evolução
              aparece aqui como um gráfico.
            </p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico de evolução do score">
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F80FF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2F80FF" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((g) => (
                <g key={g}>
                  <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#1E2740" strokeWidth="1" />
                  <text x={padL - 8} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#63708c">{g}</text>
                </g>
              ))}
              <path d={area} fill="url(#fill)" />
              <path d={linha} fill="none" stroke="#2F80FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pontos.map((p, i) => (
                <g key={i}>
                  <circle cx={x(i)} cy={y(p.score)} r="4" fill={faixaCor(p.score)} stroke="#070A12" strokeWidth="2" />
                  <text x={x(i)} y={y(p.score) - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#EAF0FA">{p.score}</text>
                  <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#63708c">{mes(p.data)}</text>
                </g>
              ))}
            </svg>
          )}
        </div>

        {/* Linha do tempo */}
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-bold">Histórico</h2>
          <div className="space-y-2">
            {[...pontos].reverse().map((p, i, arr) => {
              const anterior = arr[i + 1];
              const d = anterior ? p.score - anterior.score : 0;
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-[#1E2740] bg-[#0F1626] p-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: faixaCor(p.score) }} />
                  <span className="text-sm text-[#8B96AC]">
                    {new Date(p.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                  <span className="ml-auto font-bold">{p.score}/100</span>
                  {anterior && (
                    <span className="w-12 text-right text-xs font-bold" style={{ color: d >= 0 ? "#31D0AA" : "#FF6B6B" }}>
                      {d >= 0 ? `+${d}` : d}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
