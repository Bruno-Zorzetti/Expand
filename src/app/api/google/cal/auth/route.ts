import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function readConfig(key: string): Promise<string> {
  if (process.env[key]) return process.env[key]!;
  const sb = createAdminClient();
  if (!sb) return "";
  const { data } = await sb.from("system_config").select("value").eq("key", key).single();
  return (data?.value as string) ?? "";
}

export async function GET(req: NextRequest) {
  // Requer auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const perfilId = req.nextUrl.searchParams.get("perfilId") ?? "";
  if (!perfilId) return NextResponse.json({ error: "perfilId obrigatório" }, { status: 400 });

  // Só admin ou o próprio membro
  const isAdmin  = me?.role === "admin";
  const isOwner  = (me?.expand_membro as string | null) === perfilId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const [clientId, siteUrl] = await Promise.all([
    readConfig("GOOGLE_CLIENT_ID"),
    readConfig("NEXT_PUBLIC_SITE_URL"),
  ]);
  const base = siteUrl || req.nextUrl.origin;

  if (!clientId) {
    return NextResponse.redirect(`${base}/expand/equipe/${perfilId}?gcal=erro&msg=${encodeURIComponent("GOOGLE_CLIENT_ID não configurado")}`);
  }

  const redirectUri = `${base}/api/google/cal/callback`;
  const scopes = [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events",
  ].join(" ");

  const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauthUrl.searchParams.set("client_id",     clientId);
  oauthUrl.searchParams.set("redirect_uri",  redirectUri);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope",         scopes);
  oauthUrl.searchParams.set("access_type",   "offline");
  oauthUrl.searchParams.set("prompt",        "consent");
  oauthUrl.searchParams.set("state",         perfilId);   // carrega perfilId no state

  return NextResponse.redirect(oauthUrl.toString());
}
