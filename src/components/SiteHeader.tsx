import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ThemeControls from "@/components/ThemeControls";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isStaff = false;
  if (user) {
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isStaff = !!me && ["admin", "equipe"].includes(me.role);
  }

  async function logout() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/expand" className="flex items-center gap-2 font-extrabold tracking-wide text-[var(--txt)]">
          <span className="relative grid h-7 w-6 place-items-center">
            <svg viewBox="0 0 26 30" fill="none" className="absolute inset-0">
              <path d="M13 1 24 7.5v15L13 29 2 22.5v-15L13 1Z" stroke="var(--accent)" strokeWidth="1.6" />
            </svg>
            <b className="relative text-[12px] font-black text-[var(--accent)]">E</b>
          </span>
          EXPAND
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link href="/expand/produtos" className="rounded-lg px-3 py-1.5 text-[var(--mut)] hover:text-[var(--txt)]">
            Catálogo
          </Link>
          <Link href="/agentes" className="rounded-lg px-3 py-1.5 text-[var(--mut)] hover:text-[var(--txt)]">
            Agentes
          </Link>
          <Link href="/contato" className="rounded-lg px-3 py-1.5 text-[var(--mut)] hover:text-[var(--txt)]">
            Contato
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="rounded-lg px-3 py-1.5 font-semibold text-[var(--txt)] hover:text-[var(--accent)]">
                Meu painel
              </Link>
              {isStaff && (
                <Link href="/admin" className="rounded-lg px-3 py-1.5 font-semibold text-[var(--accent)] hover:underline">
                  Admin
                </Link>
              )}
              <form action={logout}>
                <button className="rounded-lg px-3 py-1.5 text-[var(--mut)] hover:text-[var(--txt)]">Sair</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="hx-btn hx-btn-primary px-4 py-1.5 text-sm">
              Entrar
            </Link>
          )}
          <div className="ml-1">
            <ThemeControls variant="toggle" />
          </div>
        </nav>
      </div>
    </header>
  );
}
