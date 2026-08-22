import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  nova:       { label: "Nova",        color: "var(--accent)" },
  analise:    { label: "Em análise",  color: "#F59E0B" },
  tarefa:     { label: "Virou tarefa", color: "#3B82F6" },
  concluida:  { label: "Concluída",   color: "var(--green)" },
};

const TIPO_ICONE: Record<string, string> = {
  demanda: "＋", mensagem: "💬", solicitacao: "＋", alerta: "⏰", aviso: "ℹ",
};

export default async function SolicitacoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: items } = await supabase
    .from("expand_notificacoes")
    .select("id, tipo, texto, link, lida, criado_em")
    .eq("cliente_id", id)
    .in("tipo", ["demanda", "mensagem", "solicitacao"])
    .order("criado_em", { ascending: false })
    .limit(50);

  const lista = items ?? [];

  const fmt = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ padding: "32px 28px", maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--accent)", marginBottom: 6 }}>Histórico</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--txt)", margin: 0 }}>Suas solicitações</h1>
        <p style={{ fontSize: 13.5, color: "var(--mut)", marginTop: 4 }}>Tudo que você enviou para a equipe — demandas, mensagens e pedidos especiais.</p>
      </div>

      {lista.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", marginBottom: 6 }}>Nenhuma solicitação ainda</div>
          <div style={{ fontSize: 13, color: "var(--mut)" }}>Use o botão "+" no canto da tela para enviar uma demanda à equipe.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map((item) => {
            const st = STATUS_LABEL[item.lida ? "concluida" : "nova"];
            return (
              <div key={item.id} style={{
                padding: "16px 18px", borderRadius: 12,
                background: "var(--panel)", border: `1px solid ${item.lida ? "var(--line)" : "color-mix(in srgb, var(--accent) 25%, var(--line))"}`,
                display: "flex", alignItems: "flex-start", gap: 14,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb, var(--accent) 12%, var(--panel-2))", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>
                  {TIPO_ICONE[item.tipo ?? ""] ?? "•"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.5, marginBottom: 4 }}>{item.texto}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>{fmt(item.criado_em)}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `color-mix(in srgb, ${st.color} 14%, transparent)`, color: st.color, flexShrink: 0 }}>
                  {st.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
