import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Se next foi explicitamente passado, respeita
      if (next && next !== "/" && !next.startsWith("//")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Caso contrário, roteia pelo papel do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (profile?.role as string) ?? "pendente";
        if (role === "admin" || role === "equipe") {
          return NextResponse.redirect(`${origin}/expand/v2`);
        }
        if (role === "cliente") {
          return NextResponse.redirect(`${origin}/cliente`);
        }
      }

      // pendente ou sem perfil → tela de aguardando
      return NextResponse.redirect(`${origin}/aguardando`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
