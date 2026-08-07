import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import { postarSala } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Msg = { id: string; autor_id: string | null; autor: string | null; texto: string; criado_em: string };

export default async function Sala() {
  const { pessoa } = await getPessoa();
  const supabase = await createClient();
  const { data } = await supabase.from("expand_sala").select("*").order("criado_em", { ascending: true }).limit(120);
  const msgs = (data ?? []) as Msg[];

  return (
    <>
      <p className="hx-eyebrow">Time · conversa interna</p>
      <h1 className="ex-h1">Sala do <span className="hx-accent-text">time</span></h1>
      <p className="ex-sub">Um canal rápido entre a equipe — recados, dúvidas e combinados do dia. Para falar com um agente, use o botão de assistentes no canto.</p>

      <div className="ex-panel hx-glass" style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: 400 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, maxHeight: 560 }}>
          {msgs.length ? msgs.map((m) => {
            const meu = m.autor_id === pessoa.id;
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: meu ? "flex-end" : "flex-start", gap: 3 }}>
                <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{meu ? "você" : m.autor} · {new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                <div style={{ maxWidth: "78%", fontSize: 13.5, lineHeight: 1.5, padding: "9px 13px", borderRadius: 12, whiteSpace: "pre-wrap", background: meu ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--panel-2)", border: `1px solid ${meu ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--line)"}` }}>{m.texto}</div>
              </div>
            );
          }) : <div style={{ margin: "auto", color: "var(--dim)", fontSize: 13 }}>Ninguém falou ainda. Comece a conversa. 👋</div>}
        </div>
        <form action={postarSala} style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid var(--line)" }}>
          <input name="texto" required placeholder="Escreva pro time…" autoComplete="off"
            style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 10, color: "var(--txt)", padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "0 16px" }}>Enviar</button>
        </form>
      </div>
    </>
  );
}
