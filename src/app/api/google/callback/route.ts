import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function saveConfig(key: string, value: string) {
  const sb = createAdminClient();
  if (!sb) return;
  await sb.from("system_config").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}

async function readConfig(key: string): Promise<string> {
  return process.env[key] ?? (() => {
    const sb = createAdminClient();
    return sb ? sb.from("system_config").select("value").eq("key", key).single().then(r => (r.data?.value as string) ?? "") : Promise.resolve("");
  })();
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  if (error || !code) {
    return NextResponse.redirect(`${base}/expand/integracoes?google=erro&msg=${encodeURIComponent(error ?? "codigo ausente")}`);
  }

  const clientId     = await readConfig("GOOGLE_CLIENT_ID");
  const clientSecret = await readConfig("GOOGLE_CLIENT_SECRET");
  const redirectUri  = `${base}/api/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${base}/expand/integracoes?google=erro&msg=${encodeURIComponent("GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurados")}`);
  }

  // Troca o code por access_token + refresh_token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });
  const tokens = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (tokens.error || !tokens.access_token) {
    const msg = tokens.error_description ?? tokens.error ?? "erro ao obter tokens";
    return NextResponse.redirect(`${base}/expand/integracoes?google=erro&msg=${encodeURIComponent(msg)}`);
  }

  // Busca o email da conta
  let email = "";
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userRes.json() as { email?: string };
    email = user.email ?? "";
  } catch {}

  // Salva os tokens e metadados
  await Promise.all([
    saveConfig("GOOGLE_ACCESS_TOKEN",  tokens.access_token),
    tokens.refresh_token ? saveConfig("GOOGLE_REFRESH_TOKEN", tokens.refresh_token) : Promise.resolve(),
    email ? saveConfig("GOOGLE_USER_EMAIL", email) : Promise.resolve(),
    saveConfig("GOOGLE_CONNECTED_AT", new Date().toISOString()),
  ]);

  return NextResponse.redirect(`${base}/expand/integracoes?google=ok`);
}
