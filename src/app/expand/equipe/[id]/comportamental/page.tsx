import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/expand-perfis";
import type { DiscKey } from "@/lib/expand-disc";
import type { ArqKey } from "@/lib/expand-arquetipo";
import type { TempKey } from "@/lib/expand-temperamento";
import type { DiscAnalise, TempAnalise, ArqAnalise, VisaoIntegrada } from "@/lib/expand-analise-prompt";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import DiagPerfil360 from "@/components/expand/DiagPerfil360";

export const dynamic = "force-dynamic";

export default async function Comportamental({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: pRaw }, { data: analises }] = await Promise.all([
    supabase.from("expand_perfis").select("*").eq("id", id).single(),
    supabase.from("expand_diag_analise").select("tipo, analise").eq("perfil_id", id),
  ]);

  if (!pRaw) notFound();
  const p = pRaw as Perfil;

  // Montar mapa de análises
  const anaMap: Record<string, Record<string, unknown>> = {};
  for (const row of analises ?? []) {
    anaMap[row.tipo] = row.analise as Record<string, unknown>;
  }

  const diagData = {
    perfil: {
      id: p.id,
      nome: p.nome,
      cargo: p.cargo ?? null,
      disc: p.disc as Record<DiscKey, number> | null,
      disc_segmento: p.disc_segmento ?? null,
      disc_blenda: p.disc_blenda ?? null,
      arquetipo: p.arquetipo as Record<ArqKey, number> | null,
      arquetipo_dominante: (p.arquetipo_dominante as ArqKey) ?? null,
      temperamento: p.temperamento as Record<TempKey, number> | null,
      temperamento_dominante: (p.temperamento_dominante as TempKey) ?? null,
      temperamento_apoio: (p.temperamento_apoio as TempKey) ?? null,
      cor: p.cor ?? null,
    },
    analises: {
      disc: (anaMap["disc"] as DiscAnalise) ?? null,
      temperamento: (anaMap["temperamento"] as TempAnalise) ?? null,
      arquetipo: (anaMap["arquetipo"] as ArqAnalise) ?? null,
      visao_integrada: (anaMap["visao_integrada"] as VisaoIntegrada) ?? null,
    },
  };

  const temAlgum = p.disc || p.arquetipo || p.temperamento;

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = me?.role === "admin";
  }

  return (
    <>
      <Link href={`/expand/equipe/${id}`} className="ex-back">← Voltar ao perfil</Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        <PerfilAvatar p={p} size={58} radius={13} />
        <div style={{ flex: 1 }}>
          <p className="hx-eyebrow">Perfil Comportamental 360°</p>
          <h1 className="ex-h1" style={{ margin: 0 }}>{p.nome}</h1>
          <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>
            {p.cargo}{p.area ? ` · ${p.area}` : ""}
          </p>
        </div>
        <Link
          href={`/expand/equipe/${id}/diagnostico`}
          style={{
            fontSize: 13, padding: "7px 14px", borderRadius: 9,
            background: "var(--panel-2)", border: "1px solid var(--line-2)",
            color: "var(--txt)", textDecoration: "none", flexShrink: 0,
          }}
        >
          {temAlgum ? "Refazer diagnósticos" : "Fazer diagnósticos"}
        </Link>
      </div>

      {!temAlgum ? (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <p style={{ color: "var(--dim)", fontSize: 14 }}>
            Nenhum diagnóstico preenchido ainda.
          </p>
          <Link
            href={`/expand/equipe/${id}/diagnostico`}
            className="hx-btn hx-btn-primary"
            style={{ display: "inline-block", marginTop: 14, padding: "9px 22px", fontSize: 13 }}
          >
            Ir para Diagnósticos
          </Link>
        </div>
      ) : (
        <DiagPerfil360 data={diagData} isAdmin={isAdmin} />
      )}
    </>
  );
}
