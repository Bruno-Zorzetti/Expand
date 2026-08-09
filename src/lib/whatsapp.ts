// Envio de WhatsApp via uazapi (server-side apenas — usa secrets não públicos).
// POST {UAZAPI_URL}/send/text · header token · body { number, text }.
// number aceita telefone OU o JID de um grupo (ex.: 12036...@g.us).
export async function enviarWhatsapp(
  destino: string,
  text: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const url = process.env.UAZAPI_URL;
  const token = process.env.UAZAPI_TOKEN;
  if (!url || !token) return { ok: false, skipped: true };
  const ehGrupo = destino.includes("@g.us");
  const number = ehGrupo ? destino : (destino || "").replace(/\D/g, "");
  if (!ehGrupo && number.length < 10) return { ok: false, error: "numero invalido" };
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", token },
      body: JSON.stringify({ number, text }),
    });
    if (!res.ok) return { ok: false, error: `uazapi ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

// Lista os grupos do número conectado (GET {UAZAPI_URL}/group/list · header token).
type GRaw = Record<string, unknown>;
export async function listarGrupos(): Promise<{ jid: string; nome: string }[]> {
  const url = process.env.UAZAPI_URL, token = process.env.UAZAPI_TOKEN;
  if (!url || !token) return [];
  const pick = (o: GRaw, ...keys: string[]) => { for (const k of keys) { const v = o[k]; if (typeof v === "string" && v) return v; } return ""; };
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/group/list`, { headers: { token }, cache: "no-store" });
    if (!res.ok) return [];
    const j = (await res.json()) as GRaw;
    const raw = Array.isArray(j) ? j : (j.groups ?? j.data ?? j.chats ?? j.results ?? []);
    const arr = (Array.isArray(raw) ? raw : []) as GRaw[];
    return arr
      .map((g) => ({ jid: pick(g, "JID", "jid", "id", "groupJid", "chatid"), nome: pick(g, "name", "subject", "Name", "Subject") || "Grupo" }))
      .filter((g) => g.jid.includes("g.us"));
  } catch { return []; }
}
