import { NextRequest, NextResponse } from "next/server";
import { getAcesso } from "@/lib/expand-acesso";
import { linkConviteGrupo } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const jid = req.nextUrl.searchParams.get("jid");
  if (!jid) return NextResponse.json({ error: "jid obrigatório" }, { status: 400 });

  const link = await linkConviteGrupo(jid);
  if (!link) return NextResponse.json({ error: "Não foi possível obter o link de convite" }, { status: 502 });

  return NextResponse.json({ link });
}
