/**
 * POST /api/vma/leads
 *
 * Recebe leads dos portais (OLX, Chave na Mão, Mercado Livre…),
 * salva em vma_leads e notifica via WhatsApp.
 */
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function GET() {
  return Response.json(
    { endpoint: "/api/vma/leads", method: "POST", status: "online" },
    { headers: CORS }
  );
}

// ── Normaliza campos de diferentes portais ────────────────────────────────────
function parseLead(body: Record<string, unknown>, portal: string) {
  // OLX Canal Pro / GrupZap
  const nome     = String(body.clientName  || body.name      || body.nome      || "");
  const email    = String(body.clientEmail || body.email     || body.Email     || "");
  const telefone = String(body.clientPhone || body.phone     || body.telefone  || body.cel || "");
  const mensagem = String(body.message     || body.mensagem  || body.text      || body.obs || "");
  const listingId = String(
    body.listingId   || body.listing_id   ||
    body.referencia  || body.codigoImovel ||
    body.propertyId  || ""
  );

  // Detecta portal pelo header ou campo do body
  const portalDetectado =
    String(body.portalId || body.portal || body.source || portal).toLowerCase();

  return { nome, email, telefone, mensagem, listing_id: listingId, portal: portalDetectado };
}

// ── Notifica via WhatsApp (uazapi) ────────────────────────────────────────────
async function notificarWhatsApp(lead: {
  nome: string; email: string; telefone: string; mensagem: string; listing_id: string; portal: string;
}) {
  const url   = process.env.UAZAPI_URL;
  const token = process.env.UAZAPI_TOKEN;
  const dest  = process.env.VMA_WHATSAPP_DESTINO || process.env.HASHES_WHATSAPP;

  if (!url || !token || !dest) return;

  const texto = [
    `🏠 *Novo lead VMA*`,
    ``,
    `*Portal:* ${lead.portal || "—"}`,
    lead.listing_id ? `*Imóvel:* ${lead.listing_id}` : null,
    `*Nome:* ${lead.nome || "—"}`,
    lead.telefone ? `*Tel:* ${lead.telefone}` : null,
    lead.email    ? `*E-mail:* ${lead.email}` : null,
    lead.mensagem ? `*Mensagem:* ${lead.mensagem}` : null,
  ].filter(Boolean).join("\n");

  try {
    await fetch(`${url}/message/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: dest, text: texto }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.warn("[vma/leads] WhatsApp error:", err instanceof Error ? err.message : err);
  }
}

export async function POST(req: Request) {
  const receivedAt  = new Date().toISOString();
  const source      = req.headers.get("x-forwarded-for") || "unknown";
  const contentType = req.headers.get("content-type") || "";

  // Detecta portal pela URL: ?portal=olx
  const portalParam = new URL(req.url).searchParams.get("portal") || "olx";

  // Lê o body
  let raw: Record<string, unknown> = {};
  let rawText = "";
  try {
    rawText = await req.text();
    if (rawText) {
      try { raw = JSON.parse(rawText); } catch { /* form data ou outro formato */ }
    }
  } catch { /* ignore */ }

  console.log(JSON.stringify({ event: "vma_lead", receivedAt, source, body: rawText.slice(0, 1000) }));

  // Normaliza
  const lead = parseLead(raw, portalParam);

  // Salva no banco (anon key — policy INSERT liberada)
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { error: dbErr } = await sb.from("vma_leads").insert({
    portal:     lead.portal || portalParam,
    listing_id: lead.listing_id || null,
    nome:       lead.nome       || null,
    email:      lead.email      || null,
    telefone:   lead.telefone   || null,
    mensagem:   lead.mensagem   || null,
    raw,
  });

  if (dbErr) console.error("[vma/leads] DB error:", dbErr.message);

  // Notificação WhatsApp (fire-and-forget)
  notificarWhatsApp(lead).catch(() => {});

  // Encaminha para Ingaia (se configurado e homologado)
  const ingaiaUrl = process.env.VMA_INGAIA_LEADS_URL;
  if (ingaiaUrl && contentType) {
    fetch(ingaiaUrl, {
      method: "POST",
      headers: { "Content-Type": contentType, "User-Agent": "ExpandBridge/1.0" },
      body: rawText,
      signal: AbortSignal.timeout(15_000),
    }).catch(() => {});
  }

  // Sempre 200 — portais param de retentar
  return Response.json({ ok: true, receivedAt }, { headers: CORS });
}
