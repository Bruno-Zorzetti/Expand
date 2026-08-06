"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ThemeControls from "@/components/ThemeControls";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="hx-ambient grid min-h-screen place-items-center px-6 text-[var(--txt)]" />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const destino = params.get("next") || "/cliente";
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setMsg(error.message);
      } else {
        // reload completo garante que o servidor leia a sessão (evita re-login)
        window.location.assign(destino);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { full_name: nome } },
      });
      if (error) setMsg(error.message);
      else {
        setMsg("Conta criada. Se pedir confirmação, cheque seu e-mail. Agora é só entrar.");
        setMode("login");
      }
    }
    setLoading(false);
  }

  const field =
    "w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--txt)] outline-none focus:border-[var(--accent)]";

  return (
    <main className="hx-ambient grid min-h-screen place-items-center px-6 text-[var(--txt)]">
      <div className="fixed right-5 top-5">
        <ThemeControls variant="toggle" />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-black tracking-tight">
            EXPAND
          </p>
          <Link href="/" className="text-sm text-[var(--mut)] hover:text-[var(--txt)]">
            ← Voltar ao catálogo
          </Link>
        </div>
        <div className="hx-glass p-7">
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                mode === "login" ? "hx-accent text-white" : "border border-[var(--line-2)] text-[var(--mut)]"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                mode === "signup" ? "hx-accent text-white" : "border border-[var(--line-2)] text-[var(--mut)]"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input required placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} className={field} />
            )}
            <input required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            <input required type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className={field} />
            <button disabled={loading} className="hx-btn hx-btn-primary w-full justify-center disabled:opacity-60">
              {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          {msg && <p className="mt-4 text-sm text-[var(--mut)]">{msg}</p>}
        </div>
      </div>
    </main>
  );
}
