import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Feed ICS por pessoa (token unguessable). Cada perfil assina no Google/Apple/Outlook.
// Usa a função SECURITY DEFINER `agenda_ics` (não exige login).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tok = token.replace(/\.ics$/i, "");
  const supabase = await createClient();
  const { data } = await supabase.rpc("agenda_ics", { tok });
  const rows = (data ?? []) as { id: string; titulo: string; cliente: string | null; data: string; marco: boolean }[];

  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const dt = (d: string) => d.replace(/-/g, "");
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Expand//Agenda//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Expand — minhas tarefas",
  ];
  for (const r of rows) {
    const d = dt(r.data);
    const dend = dt(new Date(new Date(r.data + "T00:00:00").getTime() + 864e5).toISOString().slice(0, 10));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.id}@expand`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${dend}`,
      `SUMMARY:${esc((r.marco ? "◆ " : "") + r.titulo + (r.cliente ? ` — ${r.cliente}` : ""))}`,
      r.marco ? "CATEGORIES:MARCO" : "CATEGORIES:TAREFA",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=900" },
  });
}
