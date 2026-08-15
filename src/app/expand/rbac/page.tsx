import { createClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/expand-acesso";
import { MODULOS, SECOES } from "@/lib/expand-modulos";
import { toggleModulo, liberarSecao, revogarSecao } from "./actions";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  role: string;
  expand_membro: string | null;
  expand_modulos: string[] | null;
};

const SECAO_COR: Record<string, string> = {
  Tarefas:     "#6FBF92",
  Projetos:    "#86C0A6",
  Ferramentas: "#C89B5E",
  Comercial:   "#CE6A5F",
  Financeiro:  "#E6D0A8",
};

export default async function RBACPage() {
  await exigirAdmin();
  const supabase = await createClient();

  const { data: usersData } = await supabase
    .from("profiles")
    .select("id, email, role, expand_membro, expand_modulos")
    .in("role", ["equipe", "admin"])
    .order("role");

  const users = (usersData ?? []) as UserRow[];
  const equipe = users.filter((u) => u.role === "equipe");

  return (
    <>
      <p className="hx-eyebrow">Configurações · Admin</p>
      <h1 className="ex-h1">
        Controle de <span className="hx-accent-text">Acesso</span>
      </h1>
      <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 28, maxWidth: 600, lineHeight: 1.6 }}>
        Gerencie quais módulos cada membro da equipe pode acessar.
        Admin sempre vê tudo. Marque os checkboxes para liberar acesso.
      </p>

      {equipe.length === 0 ? (
        <div style={{ padding: "32px", background: "var(--panel-2)", borderRadius: 12, border: "1px solid var(--line)", color: "var(--dim)", textAlign: "center", fontSize: 13 }}>
          Nenhum membro da equipe cadastrado.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {equipe.map((user) => {
            const modulos = user.expand_modulos ?? [];
            return (
              <div
                key={user.id}
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {/* User header */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--bg)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {(user.expand_membro ?? user.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>
                      {user.expand_membro ?? user.email}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)" }}>
                      {user.email} · {modulos.length} módulo{modulos.length !== 1 ? "s" : ""} ativo{modulos.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 11, color: "var(--dim)" }}>Liberar seção:</span>
                    {SECOES.map((sec) => {
                      const gates = MODULOS.filter((m) => m.secao === sec).map((m) => m.gate);
                      const allActive = gates.every((g) => modulos.includes(g));
                      return (
                        <form key={sec} action={allActive ? revogarSecao.bind(null, user.id, sec.toLowerCase()) : liberarSecao.bind(null, user.id, sec.toLowerCase(), gates)}>
                          <button
                            type="submit"
                            style={{
                              fontSize: 10.5,
                              padding: "3px 10px",
                              borderRadius: 20,
                              border: `1px solid ${allActive ? (SECAO_COR[sec] ?? "var(--accent)") : "var(--line)"}`,
                              background: allActive ? `color-mix(in srgb,${SECAO_COR[sec] ?? "var(--accent)"} 15%,transparent)` : "transparent",
                              color: allActive ? (SECAO_COR[sec] ?? "var(--accent)") : "var(--dim)",
                              cursor: "pointer",
                              fontWeight: allActive ? 700 : 400,
                              transition: "all .15s",
                            }}
                          >
                            {allActive ? "✓ " : ""}{sec}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </div>

                {/* Module grid by section */}
                <div style={{ padding: "16px 20px" }}>
                  {SECOES.map((sec) => {
                    const modulosDaSec = MODULOS.filter((m) => m.secao === sec);
                    const cor = SECAO_COR[sec] ?? "var(--accent)";
                    return (
                      <div key={sec} style={{ marginBottom: 18 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: ".07em",
                            color: cor,
                            marginBottom: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: cor, display: "inline-block" }} />
                          {sec}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {modulosDaSec.map((m) => {
                            const ativo = modulos.includes(m.gate);
                            return (
                              <form key={m.gate} action={toggleModulo.bind(null, user.id, m.gate, !ativo)}>
                                <button
                                  type="submit"
                                  title={m.descricao}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontSize: 12,
                                    padding: "5px 12px",
                                    borderRadius: 8,
                                    border: `1px solid ${ativo ? cor : "var(--line)"}`,
                                    background: ativo ? `color-mix(in srgb,${cor} 12%,transparent)` : "var(--bg)",
                                    color: ativo ? cor : "var(--dim)",
                                    cursor: "pointer",
                                    fontWeight: ativo ? 700 : 400,
                                    transition: "all .15s",
                                  }}
                                >
                                  <span style={{ fontSize: 10, fontWeight: 900 }}>
                                    {ativo ? "✓" : "○"}
                                  </span>
                                  {m.label}
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin users — read only */}
      <div style={{ marginTop: 32, padding: "14px 20px", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 8 }}>
          Admins — acesso total (não editável)
        </div>
        {users.filter((u) => u.role === "admin").map((u) => (
          <div key={u.id} style={{ fontSize: 12.5, color: "var(--txt)", marginBottom: 4 }}>
            <span style={{ color: "var(--accent)", marginRight: 6 }}>◆</span>
            {u.email}
          </div>
        ))}
      </div>
    </>
  );
}
