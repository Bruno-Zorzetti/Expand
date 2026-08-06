"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

export default function BaixarPdf({ orderId, empresa }: { orderId: string; empresa?: string }) {
  const supabase = createClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(empresa ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const field = "w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--txt)] outline-none focus:border-[var(--accent)]";

  async function baixar() {
    if (!nome.trim() || !whatsapp.trim()) return setErro("Preencha nome e WhatsApp.");
    setEnviando(true);
    setErro(null);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("leads").insert({ order_id: orderId, user_id: u.user?.id ?? null, nome: nome.trim(), whatsapp: whatsapp.trim(), origem: "pdf" });
    setEnviando(false);
    window.open(`/diagnostico/${orderId}/relatorio`, "_blank", "noopener");
    setAberto(false);
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="hx-btn hx-btn-ghost px-7 py-3">
        <Icon name="arrowRight" size={15} /> Baixar relatório em PDF
      </button>
    );
  }
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-[var(--line-2)] bg-[var(--panel)] p-4 text-left">
      <p className="text-sm font-bold">Receba o relatório completo</p>
      <p className="mb-3 text-xs text-[var(--mut)]">Deixe seu contato pra gerar o PDF.</p>
      <div className="space-y-2">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da empresa" className={field} />
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp" className={field} />
        {erro && <p className="text-xs text-[var(--red)]">{erro}</p>}
        <div className="flex gap-2">
          <button onClick={baixar} disabled={enviando} className="hx-btn hx-btn-primary flex-1 justify-center disabled:opacity-60">
            {enviando ? "Gerando..." : "Gerar PDF"}
          </button>
          <button onClick={() => setAberto(false)} className="hx-btn hx-btn-ghost">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
