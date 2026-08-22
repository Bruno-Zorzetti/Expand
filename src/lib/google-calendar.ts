import { createAdminClient } from "@/lib/supabase/admin";

type RawToken = {
  access_token: string;
  refresh_token: string | null;
  email: string | null;
  connected_at: string;
};

async function readConfig(key: string): Promise<string> {
  if (process.env[key]) return process.env[key]!;
  const sb = createAdminClient();
  if (!sb) return "";
  const { data } = await sb.from("system_config").select("value").eq("key", key).single();
  return (data?.value as string) ?? "";
}

/** Lê o token do perfil e renova via refresh_token se necessário. */
export async function getCalTokenForPerfil(perfilId: string): Promise<string | null> {
  const sb = createAdminClient();
  if (!sb) return null;

  const { data } = await sb
    .from("expand_google_tokens")
    .select("access_token, refresh_token, email, connected_at")
    .eq("perfil_id", perfilId)
    .single();
  if (!data) return null;
  const row = data as RawToken;

  // Testa se o access_token ainda é válido
  const test = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1", {
    headers: { Authorization: `Bearer ${row.access_token}` },
  });
  if (test.ok) return row.access_token;

  // Expirou — renova
  if (!row.refresh_token) return null;
  const [clientId, clientSecret] = await Promise.all([
    readConfig("GOOGLE_CLIENT_ID"),
    readConfig("GOOGLE_CLIENT_SECRET"),
  ]);
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: row.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json() as { access_token?: string };
  if (!j.access_token) return null;

  await sb.from("expand_google_tokens")
    .update({ access_token: j.access_token, updated_at: new Date().toISOString() })
    .eq("perfil_id", perfilId);

  return j.access_token;
}

export type CalEvent = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  allDay: boolean;
  link: string | null;
  local: string | null;
  meet: string | null;
};

/** Lista os próximos N eventos do Google Calendar de um perfil. */
export async function listarEventos(perfilId: string, maxResults = 8): Promise<CalEvent[]> {
  const token = await getCalTokenForPerfil(perfilId);
  if (!token) return [];

  const timeMin = new Date().toISOString();
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("fields", "items(id,summary,start,end,htmlLink,location,conferenceData)");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];

  const data = await res.json() as { items?: unknown[] };
  const items = (data.items ?? []) as Record<string, unknown>[];

  return items.map((ev) => {
    const start = ev.start as Record<string, string> | undefined;
    const end   = ev.end   as Record<string, string> | undefined;
    const conf  = ev.conferenceData as Record<string, unknown> | undefined;
    const entryPoints = (conf?.entryPoints as Record<string, string>[] | undefined) ?? [];
    const meet  = entryPoints.find(e => e.entryPointType === "video")?.uri ?? null;
    return {
      id:     String(ev.id ?? ""),
      titulo: String(ev.summary ?? "(sem título)"),
      inicio: String(start?.dateTime ?? start?.date ?? ""),
      fim:    end?.dateTime ? String(end.dateTime) : (end?.date ? String(end.date) : null),
      allDay: !start?.dateTime,
      link:   ev.htmlLink ? String(ev.htmlLink) : null,
      local:  ev.location ? String(ev.location) : null,
      meet,
    };
  });
}
