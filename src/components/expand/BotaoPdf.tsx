"use client";
export default function BotaoPdf({ label = "Baixar PDF (imprimir)" }: { label?: string }) {
  return <button onClick={() => window.print()} className="hx-btn hx-btn-primary no-print" style={{ fontSize: 12 }}>{label}</button>;
}
