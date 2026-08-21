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

// Busca o link de convite de um grupo (chat.whatsapp.com/...) no uazapi.
export async function linkConviteGrupo(jid: string): Promise<string | null> {
  const url = process.env.UAZAPI_URL, token = process.env.UAZAPI_TOKEN;
  if (!url || !token || !jid) return null;
  const base = url.replace(/\/$/, "");
  const H = { "Content-Type": "application/json; charset=utf-8", token };
  for (const rota of ["/group/inviteLink", "/group/invitecode", "/group/inviteCode"]) {
    try {
      const r = await fetch(`${base}${rota}`, { method: "POST", headers: H, body: JSON.stringify({ groupjid: jid, groupJid: jid }), cache: "no-store" });
      if (!r.ok) continue;
      const j = (await r.json()) as Record<string, unknown>;
      const cand = (j.link ?? j.inviteLink ?? j.url ?? j.inviteCode ?? j.code) as string | undefined;
      if (!cand) continue;
      return cand.startsWith("http") ? cand : `https://chat.whatsapp.com/${cand}`;
    } catch { /* tenta a próxima rota */ }
  }
  return null;
}

// Lê as mensagens recentes de um chat/grupo (POST {UAZAPI_URL}/message/find).
// Retorna null quando a API está indisponível/erro (diferente de [] que significa grupo vazio de fato).
export type MsgGrupo = { autor: string; texto: string; ts: number; nos: boolean };
export async function lerMensagensGrupo(jid: string, horas = 24, limit = 300): Promise<MsgGrupo[] | null> {
  const url = process.env.UAZAPI_URL, token = process.env.UAZAPI_TOKEN;
  if (!url || !token || !jid) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/message/find`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", token },
      body: JSON.stringify({ chatid: jid, limit }),
      cache: "no-store",
    });
    if (!res.ok) return null; // API error — não é "vazio", é falha
    const j = (await res.json()) as Record<string, unknown>;
    const arr = (Array.isArray(j.messages) ? j.messages : []) as Record<string, unknown>[];
    const corte = Date.now() - horas * 3600 * 1000;
    return arr
      .map((m) => {
        const content = (m.content ?? {}) as Record<string, unknown>;
        const texto = String(content.text ?? content.caption ?? content.description ?? "");
        const tsRaw = Number(m.messageTimestamp ?? 0);
        const ts = tsRaw > 1e12 ? tsRaw : tsRaw * 1000;
        const nos = Boolean(m.fromMe);
        const autor = String(m.senderName ?? m.pushName ?? m.sender ?? m.participant ?? (nos ? "Equipe" : "Cliente"));
        return { autor, texto, ts, nos };
      })
      .filter((m) => m.texto.trim() && m.ts >= corte)
      .sort((a, b) => a.ts - b.ts);
  } catch { return null; } // Exceção de rede — também é falha, não "vazio"
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
