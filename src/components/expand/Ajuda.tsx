// "?" de ajuda com tooltip nativo (title). Use ao lado de rótulos que precisam de explicação.
export default function Ajuda({ t }: { t: string }) {
  return <span className="ex-help" title={t}>?</span>;
}

// Textos padrão dos termos recorrentes do sistema.
export const AJUDA = {
  relacao: "Relação (0–10): o quanto o cliente gosta da agência — a saúde do relacionamento. Alto = engajado, confia, responde bem.",
  execucao: "Execução (0–10): o quanto o cliente faz a parte dele — aprova no prazo, comparece à gravação, envia acessos e materiais. Vermelho (≤4) trava a entrega.",
  churn: "Risco de churn oculto: conta com relação alta mas execução baixa. Parece saudável e não está — o cliente gosta da gente, mas não anda.",
  maturidade: "Maturidade: onde a conta está na jornada — Estruturação → Validação → Otimização → Escala.",
  comoFalar: "A dica comportamental do dossiê do cliente — como abordar aquela pessoa para a conversa funcionar.",
  sla: "SLA: o prazo combinado para a etapa. Se estoura, entra no semáforo (em risco/vencido) e no escalonamento.",
  portao: "Portão de qualidade: uma fase não abre enquanto a anterior não fecha. É o que impede a entrega de furar.",
  agenteIA: "⚡ Um agente de IA rascunha e produz; o humano dono revisa e aprova (QC). A regra 'uma etapa, um dono' continua valendo.",
} as const;
