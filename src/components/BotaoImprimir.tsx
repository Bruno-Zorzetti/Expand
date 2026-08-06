"use client";

export default function BotaoImprimir({ label = "Salvar como PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg bg-[#2F80FF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2568d8]"
    >
      {label}
    </button>
  );
}
