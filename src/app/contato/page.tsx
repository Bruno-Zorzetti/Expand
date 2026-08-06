import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Icon from "@/components/Icon";
import ChatForm from "@/components/ChatForm";
import { enviarWhatsapp } from "@/lib/whatsapp";

const CAMPOS = [
  { id: "nome", tipo: "texto", label: "Qual o seu nome?", obrigatorio: true },
  { id: "contato", tipo: "texto", label: "Seu WhatsApp ou e-mail?", obrigatorio: true, ajuda: "É por aqui que a gente te responde." },
  { id: "mensagem", tipo: "paragrafo", label: "Como podemos ajudar?" },
];

export default async function ContatoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;

  async function enviar(respostas: Record<string, unknown>) {
    "use server";
    const nome = String(respostas.nome ?? "").trim();
    const contato = String(respostas.contato ?? "").trim();
    const mensagem = String(respostas.mensagem ?? "").trim();
    const texto =
      `*Novo contato pelo site*\n\n👤 ${nome}\n📞 ${contato}\n\n${mensagem || "(sem mensagem)"}`;
    await enviarWhatsapp(process.env.HASHES_WHATSAPP ?? "", texto);
    redirect("/contato?ok=1");
  }

  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
        <p className="hx-eyebrow">Fale com a Hashes</p>
        <h1 className="mt-1 text-3xl font-extrabold">Vamos conversar sobre o seu resultado</h1>

        {sp.ok ? (
          <div className="hx-glass mt-8 flex items-center gap-3 p-6">
            <Icon name="checkCircle" size={28} className="text-[var(--green)]" />
            <div>
              <p className="font-bold">Recebido!</p>
              <p className="text-sm text-[var(--mut)]">Sua mensagem chegou pra nossa equipe. Em breve retornamos.</p>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <ChatForm
              orderId="contato"
              campos={CAMPOS}
              respostasIniciais={{}}
              action={enviar}
              intro="Oi! Me conta rapidinho o que você precisa que a Hashes já retorna."
              labelEnvio="Enviar mensagem"
              fimTexto="Confira e envie. A gente responde no WhatsApp."
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="https://wa.me/5565996779777" target="_blank" rel="noopener noreferrer" className="hx-btn hx-btn-ghost">
            <Icon name="share" size={15} /> Falar direto no WhatsApp
          </a>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
