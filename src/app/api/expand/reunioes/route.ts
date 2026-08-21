import { NextRequest, NextResponse } from "next/server";
import { getAcesso } from "@/lib/expand-acesso";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleToken } from "@/lib/google-drive";
import { enviarWhatsapp } from "@/lib/whatsapp";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { clienteId, titulo, dataHora, duracaoMin = 60, enviarGrupo = false } = body as {
    clienteId: string;
    titulo: string;
    dataHora: string; // ISO "2026-08-21T15:00:00"
    duracaoMin?: number;
    enviarGrupo?: boolean;
  };

  if (!clienteId || !titulo || !dataHora) {
    return NextResponse.json({ error: "clienteId, titulo e dataHora são obrigatórios" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Admin client indisponível" }, { status: 500 });

  // Busca dados do cliente
  const { data: cli } = await admin.from("expand_clientes").select("nome, whatsapp_grupo").eq("id", clienteId).maybeSingle();

  let meetLink: string | null = null;
  let googleEventId: string | null = null;
  let googleEventLink: string | null = null;

  // Tenta criar evento no Google Calendar com Meet
  try {
    const token = await getGoogleToken();
    if (token) {
      const startDt = new Date(dataHora);
      const endDt = new Date(startDt.getTime() + duracaoMin * 60 * 1000);

      const body = {
        summary: titulo,
        start: { dateTime: startDt.toISOString() },
        end: { dateTime: endDt.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };

      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (res.ok) {
        const ev = await res.json();
        meetLink = ev.hangoutLink ?? null;
        googleEventId = ev.id ?? null;
        googleEventLink = ev.htmlLink ?? null;
      }
    }
  } catch {
    // Calendar API falhou — continua sem o Meet link
  }

  // Salva a reunião no banco
  const { data: reuniao, error } = await admin.from("expand_reunioes").insert({
    cliente_id: clienteId,
    titulo,
    data_hora: dataHora,
    duracao_min: duracaoMin,
    meet_link: meetLink,
    google_event_id: googleEventId,
    enviado_grupo: false,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Envia no grupo do WhatsApp se solicitado
  let enviado = false;
  if (enviarGrupo && cli?.whatsapp_grupo && meetLink) {
    try {
      const fmtDt = new Date(dataHora).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      const msg =
        `📅 *Reunião agendada: ${titulo}*\n\n` +
        `🕒 Data: ${fmtDt}\n` +
        `⏱ Duração: ${duracaoMin} min\n` +
        `🔗 Link: ${meetLink}`;
      await enviarWhatsapp(cli.whatsapp_grupo as string, msg);
      await admin.from("expand_reunioes").update({ enviado_grupo: true }).eq("id", reuniao.id);
      enviado = true;
    } catch {
      // Falha no envio não bloqueia
    }
  }

  return NextResponse.json({ ok: true, meetLink, eventLink: googleEventLink, enviado, id: reuniao.id });
}
