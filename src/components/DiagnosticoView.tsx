"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Icon from "@/components/Icon";
import BaixarPdf from "@/components/BaixarPdf";

type Sinal = { key: string; label: string; categoria: "google" | "nos"; status: "ok" | "melhorar"; valor: string; pontos: number; dica: string };
type Conc = { title?: string; reviewsCount?: number; totalScore?: number | null; imagesCount?: number; distanciaKm?: number | null };
type Review = { autor: string; texto: string; estrelas: number | null; data: string | null; resposta: string | null; fotos: number };
type Snapshot = { title?: string; categoryName?: string; address?: string; reviewsCount?: number | null; totalScore?: number | null; imagesCount?: number; videosCount?: number | null; qaCount?: number; fotosUrls?: string[]; description?: string; lat?: number | null; lng?: number | null; url?: string };
type Avaliacoes = { nota: number | null; qtd: number; diasUltima: number | null; reviews1d?: number; reviews7d?: number; reviews30d: number; respostaRate: number };
type Payload = { score: number; sinais: Sinal[]; snapshot: Snapshot; concorrentes?: Conc[]; comparacao?: Record<string, number | null>; reviews?: Review[]; avaliacoes?: Avaliacoes };

const PASSOS = ["Localizando seu perfil no Google...", "Lendo avaliações e fotos...", "Comparando com concorrentes...", "Montando o diagnóstico..."];
const WPP = "5565996779777";

function faixa(s: number) {
  if (s >= 80) return "Excelente";
  if (s >= 60) return "Bom";
  if (s >= 40) return "Regular";
  return "Precisa de atenção";
}
function Estrelas({ n }: { n: number | null }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={13} style={{ color: n && i <= Math.round(n) ? "#FFC24B" : "var(--line-2)" }} />
      ))}
    </span>
  );
}
function tempoLabel(d: number | null) {
  if (d === null) return "sem avaliações";
  if (d <= 1) return "há 1 dia";
  if (d <= 7) return "há 1 semana";
  if (d <= 31) return "há 1 mês";
  return `há ${Math.round(d / 30)} meses`;
}

export default function DiagnosticoView({
  orderId,
  inicial,
  tipoServico,
}: {
  orderId: string;
  inicial: Payload | null;
  tipoServico: string;
  precos?: { setup: number; mensal: number };
}) {
  const supabase = createClient();
  const [fase, setFase] = useState<"analisando" | "pronto" | "criacao" | "erro">(inicial ? "pronto" : tipoServico === "criacao" ? "criacao" : "analisando");
  const [passo, setPasso] = useState(0);
  const [dados, setDados] = useState<Payload | null>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<"Manhã" | "Tarde" | "Noite">("Manhã");
  const rodou = useRef(false);

  useEffect(() => {
    if (fase !== "analisando" || rodou.current) return;
    rodou.current = true;
    const t = setInterval(() => setPasso((p) => (p < PASSOS.length - 1 ? p + 1 : p)), 3500);
    (async () => {
      const { data, error } = await supabase.functions.invoke("diagnostico-gbp", { body: { order_id: orderId } });
      clearInterval(t);
      if (error || data?.error) { setErro(data?.error ?? error?.message ?? "Erro"); setFase("erro"); return; }
      if (data?.tipo === "criacao") { setFase("criacao"); return; }
      setDados(data.diagnostico.dados as Payload);
      setFase("pronto");
    })();
    return () => clearInterval(t);
  }, [fase, orderId, supabase]);

  if (fase === "analisando") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <div className="mx-auto mb-8 h-14 w-14 animate-spin rounded-full border-4 border-[var(--line)] border-t-[var(--accent)]" />
        <p className="text-lg font-bold">{PASSOS[passo]}</p>
        <p className="mt-2 text-sm text-[var(--mut)]">Analisando seu perfil direto no Google. Leva alguns segundos.</p>
      </div>
    );
  }
  if (fase === "criacao") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <Icon name="checkCircle" size={52} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--accent)]" />
        <h2 className="text-2xl font-extrabold">Recebemos seu pedido!</h2>
        <p className="mt-3 text-[var(--mut)]">Como você ainda não tem um perfil, nossa equipe vai criar e verificar o seu Google Meu Negócio do zero.</p>
        <Link href="/dashboard" className="hx-btn hx-btn-primary mt-6">Ir para meu painel</Link>
      </div>
    );
  }
  if (fase === "erro") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <Icon name="alert" size={52} strokeWidth={1.5} className="mx-auto mb-4 text-[#FF6B6B]" />
        <h2 className="text-xl font-extrabold">Não conseguimos concluir o diagnóstico</h2>
        <p className="mt-2 text-sm text-[var(--mut)]">{erro}</p>
        <Link href="/dashboard" className="hx-btn hx-btn-ghost mt-6">Voltar ao painel</Link>
      </div>
    );
  }

  const d = dados!;
  const snap = d.snapshot ?? {};
  const av = d.avaliacoes ?? { nota: null, qtd: 0, diasUltima: null, reviews30d: 0, respostaRate: 0 };
  const cmp = d.comparacao ?? {};
  const reviews = d.reviews ?? [];
  const google = d.sinais.filter((s) => s.categoria === "google");
  const nos = d.sinais.filter((s) => s.categoria === "nos");
  const potencial = d.sinais.filter((s) => s.status === "melhorar").reduce((t, s) => t + s.pontos, 0);
  const empresa = snap.title ?? "minha empresa";
  const wpp = (o: string) => `https://wa.me/${WPP}?text=${encodeURIComponent(`Olá! Empresa: ${empresa}. Gostaria de ${o}. Melhor período: ${periodo} (sem horário fixo).`)}`;

  const Item = ({ s }: { s: Sinal }) => (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
      <Icon name={s.status === "ok" ? "checkCircle" : "alert"} size={18} className="mt-0.5 shrink-0" style={{ color: s.status === "ok" ? "var(--green)" : "var(--warn)" }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{s.label}</p>
          <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>+{s.pontos}</span>
          <span className="text-xs font-bold" style={{ color: s.status === "ok" ? "var(--green)" : "var(--warn)" }}>
            {s.status === "ok" ? "Feito" : "Pode ser melhorado"}
          </span>
          <span className="ml-auto text-xs text-[var(--mut)]">{s.valor}</span>
        </div>
        {s.status === "melhorar" && <p className="mt-1 text-xs text-[var(--mut)]">{s.dica}</p>}
      </div>
    </div>
  );

  const Compara = ({ label, meu, media }: { label: string; meu: number; media: number }) => (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
      <p className="text-xs text-[var(--mut)]">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-xl font-extrabold" style={{ color: meu >= media ? "var(--green)" : "var(--warn)" }}>{meu}</span>
        <span className="text-xs text-[var(--dim)]">você · média {media}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 py-4">
      <p className="hx-eyebrow">Diagnóstico gratuito · +100 empresas analisadas</p>

      {/* Score bar */}
      <div className="hx-glass p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold">{snap.title ?? "Seu negócio"}</h1>
            <p className="text-sm text-[var(--mut)]">{snap.categoryName} · {snap.address}</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black">{d.score}%</span>
            <p className="text-xs text-[var(--mut)]">{faixa(d.score)}</p>
          </div>
        </div>
        <div className="mt-4 h-5 w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(d.score, 2)}%`, background: "linear-gradient(90deg,#FF4D4D,#FF8A3D,#FFC24B,#31D0AA,#2F80FF)", backgroundSize: `${(100 / Math.max(d.score, 1)) * 100}% 100%`, backgroundRepeat: "no-repeat" }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--dim)]"><span>0%</span><span>50%</span><span>100%</span></div>

        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          {[
            { ic: "star", v: av.nota ?? "—", l: "Nota" },
            { ic: "checkCircle", v: av.qtd, l: "Avaliações" },
            { ic: "user", v: snap.imagesCount ?? 0, l: "Fotos" },
            { ic: "play", v: snap.videosCount ?? 0, l: "Vídeos" },
          ].map((m) => (
            <div key={m.l} className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-2">
              <Icon name={m.ic} size={15} className="mx-auto text-[var(--accent)]" />
              <p className="mt-1 text-lg font-extrabold leading-none">{String(m.v)}</p>
              <p className="text-[10px] text-[var(--mut)]">{m.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fotos (prévia) */}
      {(snap.fotosUrls ?? []).length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold">Fotos</h2>
          <div className="hx-glass flex flex-wrap items-center gap-3 p-4">
            {(snap.fotosUrls ?? []).slice(0, 2).map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={u} alt="Foto do perfil" className="h-20 w-28 rounded-lg object-cover" />
            ))}
            <div className="min-w-0 flex-1">
              <p className="text-sm"><b>{snap.imagesCount ?? 0}</b> fotos no perfil</p>
              <p className="text-xs text-[var(--mut)]">Quantidade, qualidade e frequência contam. Meta: 20+ e novas toda semana.</p>
            </div>
          </div>
        </div>
      )}

      {/* Avaliações */}
      <div>
        <h2 className="mb-3 text-lg font-bold">Avaliações</h2>
        <div className="hx-glass p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-sm font-extrabold">
                <span>{av.reviews1d ?? 0}</span> <span className="text-xs font-normal text-[var(--dim)]">24h</span>{" · "}
                <span>{av.reviews7d ?? 0}</span> <span className="text-xs font-normal text-[var(--dim)]">7d</span>{" · "}
                <span>{av.reviews30d}</span> <span className="text-xs font-normal text-[var(--dim)]">30d</span>
              </p>
              <p className="text-xs text-[var(--mut)]">avaliações recentes</p>
            </div>
            <div><p className="text-lg font-extrabold">{tempoLabel(av.diasUltima)}</p><p className="text-xs text-[var(--mut)]">última avaliação</p></div>
            <div><p className="text-lg font-extrabold">{av.respostaRate}%</p><p className="text-xs text-[var(--mut)]">respondidas pelo dono</p></div>
          </div>
          {(av.diasUltima === null || av.diasUltima > 31) && (
            <p className="mt-3 rounded-lg bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-3 py-2 text-sm text-[var(--warn)]">
              Oportunidade: há estratégias para aumentar o volume de avaliações reais e fortalecer a autoridade no Google.
            </p>
          )}
          {av.respostaRate < 50 && (
            <p className="mt-2 rounded-lg bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-3 py-2 text-sm text-[var(--warn)]">
              Ponto de melhoria: responder avaliações aumenta a confiança e pode contribuir para um melhor desempenho do perfil.
            </p>
          )}
          {reviews.length > 0 && (
            <div className="mt-4 space-y-2">
              {reviews.slice(0, 3).map((r, i) => (
                <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                  <div className="flex items-center gap-2"><Estrelas n={r.estrelas} /><span className="text-sm font-semibold">{r.autor}</span></div>
                  {r.texto && <p className="mt-1 text-sm text-[var(--mut)]">“{r.texto}”</p>}
                  {r.resposta && <p className="mt-1 text-xs text-[var(--dim)]">Resposta do dono: {r.resposta}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Análise de mercado */}
      {(d.concorrentes ?? []).length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold">Análise de mercado <span className="text-sm font-normal text-[var(--mut)]">(vs. concorrentes próximos)</span></h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Compara label="Avaliações" meu={Number(cmp.meusReviews ?? 0)} media={Number(cmp.mediaReviewsConcorrentes ?? 0)} />
            <Compara label="Nota" meu={Number(cmp.minhaNota ?? 0)} media={Number(cmp.mediaNotaConcorrentes ?? 0)} />
            <Compara label="Fotos" meu={Number(cmp.minhasFotos ?? 0)} media={Number(cmp.mediaFotosConcorrentes ?? 0)} />
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
              <p className="text-xs text-[var(--mut)]">Líder da região</p>
              <p className="mt-1 text-xl font-extrabold">{Number(cmp.maxReviewsConcorrente ?? 0)}</p>
              <p className="text-xs text-[var(--dim)]">avaliações</p>
            </div>
          </div>
        </div>
      )}

      {/* Mapa */}
      {snap.lat && snap.lng && (
        <div>
          <h2 className="mb-3 text-lg font-bold">Sua localização</h2>
          <iframe title="Mapa" src={`https://maps.google.com/maps?q=${snap.lat},${snap.lng}&z=14&output=embed`} className="h-56 w-full rounded-2xl border border-[var(--line)]" loading="lazy" />
        </div>
      )}

      {/* O que o Google recomenda */}
      <div>
        <h2 className="text-lg font-bold">O que o Google recomenda</h2>
        <p className="mb-3 text-sm text-[var(--mut)]">Itens técnicos da plataforma.</p>
        <div className="space-y-2">{google.map((s) => <Item key={s.key} s={s} />)}</div>
      </div>

      {/* O que nós recomendamos */}
      <div>
        <h2 className="text-lg font-bold">O que nós recomendamos</h2>
        <p className="mb-3 text-sm text-[var(--mut)]">Itens estratégicos, da nossa experiência.</p>
        <div className="space-y-2">{nos.map((s) => <Item key={s.key} s={s} />)}</div>
      </div>

      {/* Potencial */}
      <div className="hx-glass p-5 text-center">
        <p className="text-sm text-[var(--mut)]">Potencial de crescimento identificado</p>
        <p className="text-3xl font-black text-[var(--green)]">+{potencial} pontos</p>
        <p className="mt-1 text-xs text-[var(--dim)]">Aplicando as melhorias acima.</p>
      </div>

      {/* CTA consultivo */}
      <div className="hx-glass p-8 text-center" style={{ boxShadow: "0 0 70px color-mix(in srgb, var(--accent) 20%, transparent)" }}>
        <h3 className="text-2xl font-extrabold">Vamos destravar esse potencial juntos</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--mut)]">
          Numa conversa consultiva de ~30 minutos, um especialista mostra como implementar essas melhorias no seu negócio,
          usando a experiência de mais de 100 empresas analisadas.
        </p>
        <div className="mt-5">
          <p className="hx-eyebrow mb-2">Melhor período pra falar</p>
          <div className="flex flex-wrap justify-center gap-2">
            {(["Manhã", "Tarde", "Noite"] as const).map((p) => (
              <button key={p} onClick={() => setPeriodo(p)} className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${periodo === p ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line-2)] text-[var(--mut)]"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={wpp("agendar uma reunião de diagnóstico")} target="_blank" rel="noopener noreferrer" className="hx-btn hx-btn-primary px-7 py-3">
            Agendar reunião de diagnóstico
          </a>
          <a href={wpp("solicitar um plano de melhorias")} target="_blank" rel="noopener noreferrer" className="hx-btn hx-btn-ghost px-7 py-3">
            Solicitar plano de melhorias
          </a>
        </div>
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <BaixarPdf orderId={orderId} empresa={snap.title} />
        </div>
      </div>
    </div>
  );
}
