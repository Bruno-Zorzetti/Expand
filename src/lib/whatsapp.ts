// Envio de WhatsApp via uazapi (server-side apenas — usa secrets não públicos).
// POST {UAZAPI_URL}/send/text  · header token · body { number, text }
export async function enviarWhatsapp(
  number: string,
  text: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const url = process.env.UAZAPI_URL;
  const token = process.env.UAZAPI_TOKEN;
  if (!url || !token) return { ok: false, skipped: true };
  const num = (number || "").replace(/\D/g, "");
  if (num.length < 10) return { ok: false, error: "numero invalido" };
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: num, text }),
    });
    if (!res.ok) return { ok: false, error: `uazapi ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}
