import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile?.role as string) !== "admin") return NextResponse.json({ erro: "acesso negado" }, { status: 403 });

  const to = req.nextUrl.searchParams.get("to") ?? user.email!;
  const result = await enviarEmail({
    to,
    subject: "Teste de e-mail — Expand Plataforma",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f1a17;color:#e8f0ec;border-radius:16px;">
        <h2 style="color:#6FBF92;margin:0 0 16px">✅ E-mail funcionando!</h2>
        <p style="color:#9ab0a3;line-height:1.6;">
          Este é um e-mail de teste enviado via <b>Resend</b> pela plataforma operacional da Expand.
        </p>
        <p style="color:#9ab0a3;line-height:1.6;">
          Se você recebeu isso, a integração está configurada corretamente.
        </p>
        <hr style="border-color:#1f3a2e;margin:20px 0;"/>
        <p style="color:#5a7a6e;font-size:11px;">Enviado para: ${to} · ${new Date().toLocaleString("pt-BR")}</p>
      </div>`,
  });

  return NextResponse.json(result);
}
