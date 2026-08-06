import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";
import { FRAMEWORKS, REGRAS_UI, type Framework } from "@/lib/frameworks";

const VISUAL: Record<string, string> = {
  "video-ou-3d": "Vídeo ou arte 3D",
  "hero-3d": "Arte 3D",
  thumbs: "Miniaturas dos produtos",
  screenshot: "Prova (screenshot real)",
  "glow-icon": "Ícone glow",
  nenhum: "Sem imagem",
};

function FrameworkCard({ fw }: { fw: Framework }) {
  return (
    <div className="hx-glass p-6">
      <p className="hx-eyebrow">{fw.pagina}</p>
      <p className="mt-2 text-sm text-[var(--mut)]">{fw.objetivo}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {fw.regra2026.map((r) => (
          <span key={r} className="rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
            {r}
          </span>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {fw.blocos.map((b, i) => (
          <div key={b.id} className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-semibold">{b.titulo}</span>
              {b.acao && (
                <span className="flex items-center gap-1 text-xs text-[var(--accent)]">
                  <Icon name="arrowRight" size={12} /> {b.acao}
                </span>
              )}
              <span className="ml-auto text-[11px] text-[var(--dim)]">{VISUAL[b.visual]}</span>
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              <p className="text-xs text-[var(--mut)]"><b className="text-[var(--dim)]">UX:</b> {b.ux}</p>
              <p className="text-xs text-[var(--mut)]"><b className="text-[var(--dim)]">UI:</b> {b.ui}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ConfigAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  return (
    <main className="hx-ambient min-h-screen text-[var(--txt)]">
      <AdminNav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="hx-eyebrow">Configurações · Frameworks de página</p>
        <h1 className="mt-1 text-3xl font-extrabold">
          Como cada página é <span className="hx-accent-text">construída</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--mut)]">
          O padrão de UI + UX que toda página nova segue. Fonte de verdade em{" "}
          <span className="font-mono">src/lib/frameworks.ts</span>.
        </p>

        {/* Regras de UI globais */}
        <div className="hx-glass mt-8 p-6">
          <p className="hx-eyebrow mb-3">Regras de UI (valem para tudo)</p>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {Object.entries(REGRAS_UI).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--dim)]">{k}</dt>
                <dd className="text-sm text-[var(--mut)]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Frameworks */}
        <div className="mt-6 space-y-5">
          <FrameworkCard fw={FRAMEWORKS.home} />
          <FrameworkCard fw={FRAMEWORKS.agente} />
          <FrameworkCard fw={FRAMEWORKS.produto} />
        </div>

        <p className="mt-8 text-xs text-[var(--dim)]">
          Regra de fundo: 1 visual pesado por página (só no hero) · fundo em efeito ambiente · imagem interna só como prova.
          Ver o design system em <Link href="/estilo" className="text-[var(--accent)] hover:underline">/estilo</Link>.
        </p>
      </div>
    </main>
  );
}
