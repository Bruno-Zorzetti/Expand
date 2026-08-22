import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function readConfig(key: string): Promise<string> {
  if (process.env[key]) return process.env[key]!;
  const sb = createAdminClient();
  if (!sb) return "";
  const { data } = await sb.from("system_config").select("value").eq("key", key).single();
  return (data?.value as string) ?? "";
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code     = searchParams.get("code");
  const error    = searchParams.get("error");
  const perfilId = searchParams.get("state") ?? "";  // passado no state

  const rawBase = process.env.NEXT_PUBLIC_SITE_URL || await readConfig("NEXT_PUBLIC_SITE_URL") || origin;
  const base = rawBase.replace(/\/$/, "");
  const back = perfilId ? `${base}/expand/equipe/${perfilId}` : `${base}/expand/equipe`;

  if (error || !code) {
    return NextResponse.redirect(`${back}?gcal=erro&msg=${encodeURIComponent(error ?? "código ausente")}`);
  }
  if (!perfilId) {
    return NextResponse.redirect(`${back}?gcal=erro&msg=${encodeURIComponent("state (perfilId) ausente")}`);
  }

  const [clientId, clientSecret] = await Promise.all([
    readConfig("GOOGLE_CLIENT_ID"),
    readConfig("GOOGLE_CLIENT_SECRET"),
  ]);
  const redirectUri = `${base}/api/google/cal/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${back}?gcal=erro&msg=${encodeURIComponent("credenciais Google não configuradas")}`);
  }

  // Troca code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json() as {
    access_token?: string; refresh_token?: string;
    error?: string; error_description?: string;
  };

  if (tokens.error || !tokens.access_token) {
    const msg = tokens.error_description ?? tokens.error ?? "erro ao obter tokens";
    return NextResponse.redirect(`${back}?gcal=erro&msg=${encodeURIComponent(msg)}`);
  }

  // Busca email
  let email = "";
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const u = await r.json() as { email?: string };
    email = u.email ?? "";
  } catch { /* noop */ }

  // Salva no banco via admin client
  const sb = createAdminClient();
  if (!sb) return NextResponse.redirect(`${back}?gcal=erro&msg=banco`);

  await sb.from("expand_google_tokens").upsert({
    perfil_id:     perfilId,
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    email,
    scopes: "calendar.events",
    connected_at: new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }, { onConflict: "perfil_id" });

  return NextResponse.redirect(`${back}?gcal=ok`);
}
