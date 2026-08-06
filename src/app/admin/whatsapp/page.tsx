import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import WhatsAppConnect from "@/components/WhatsAppConnect";

const URL_UAZ = process.env.UAZAPI_URL;
const TOKEN = process.env.UAZAPI_TOKEN;

async function status() {
  if (!URL_UAZ || !TOKEN) return { status: "nao_config" as const };
  try {
    const res = await fetch(`${URL_UAZ}/instance/status`, { headers: { token: TOKEN }, cache: "no-store" });
    const j = await res.json();
    const inst = j.instance ?? {};
    return { status: inst.status ?? "unknown", number: inst.owner ?? "", profileName: inst.profileName ?? "" };
  } catch {
    return { status: "erro" };
  }
}

export default async function WhatsAppAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  const inicial = await status();

  async function conectar() {
    "use server";
    if (!URL_UAZ || !TOKEN) return { erro: "WhatsApp não configurado no servidor (.env.local)." };
    try {
      const res = await fetch(`${URL_UAZ}/instance/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: TOKEN },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      const inst = j.instance ?? {};
      return {
        qrcode: inst.qrcode ?? null,
        paircode: inst.paircode ?? null,
        status: inst.status ?? (j.connected ? "connected" : "connecting"),
      };
    } catch (e) {
      return { erro: String((e as Error)?.message ?? e) };
    }
  }

  async function checar() {
    "use server";
    return await status();
  }

  async function desconectar() {
    "use server";
    if (!URL_UAZ || !TOKEN) return;
    try {
      await fetch(`${URL_UAZ}/instance/disconnect`, { method: "POST", headers: { token: TOKEN } });
    } catch {}
  }

  return (
    <main className="hx-ambient min-h-screen text-[var(--txt)]">
      <AdminNav />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="hx-eyebrow">Integração</p>
        <h1 className="mt-1 text-2xl font-extrabold">WhatsApp</h1>
        <p className="mt-1 mb-6 text-sm text-[var(--mut)]">
          Conecte o WhatsApp da Hashes por QR Code. É esse número que envia as notificações de
          aprovação e recebe os contatos do site. Trocou de aparelho? É só reconectar aqui.
        </p>

        {inicial.status === "nao_config" ? (
          <div className="hx-glass p-6 text-sm text-[var(--mut)]">
            Configure <span className="font-mono">UAZAPI_URL</span> e{" "}
            <span className="font-mono">UAZAPI_TOKEN</span> no arquivo <span className="font-mono">.env.local</span> e
            reinicie o servidor.
          </div>
        ) : (
          <WhatsAppConnect inicial={inicial} conectar={conectar} checar={checar} desconectar={desconectar} />
        )}
      </div>
    </main>
  );
}
