// Governança (rituais, semáforo, escalonamento, riscos) e Linha do Contrato (12 meses).

export const RITUAIS = {
  cols: ["Ritual", "Quando", "Quem", "Duração", "Objetivo"],
  rows: [
    ["Daily de Entrega", "Todo dia, 9h", "Ana, Gabriel, Vinicius", "10 min", "O que travou ontem, o que sai hoje. Só bloqueios."],
    ["Weekly de Contas", "Segunda, 10h", "Ana, Adriane, Gabriel", "40 min", "Revisar o board de todas as contas, semáforo por semáforo."],
    ["Check de Cliente", "Quarta", "Adriane", "15 min/conta", "Varrer pendências do cliente antes que virem atraso."],
    ["Reunião Estratégica", "Mensal, fim do ciclo", "Ana, Adriane + Cliente", "60 min", "Resultado do ciclo e ajustes de rota."],
    ["Retrô de Processo", "Mensal, última sexta", "Time inteiro", "45 min", "O que atrasou e por quê. Ajuste no POP, não na pessoa."],
  ],
};

export const SEMAFORO: { h: string; p: string; c: string }[] = [
  { h: "No prazo", p: "A etapa está dentro do SLA. Nada a fazer — segue.", c: "var(--green)" },
  { h: "Em risco", p: "Faltam 24h para o SLA vencer. Dispara aviso ao dono e à Ana. É aqui que se salva a entrega, não depois.", c: "var(--warn)" },
  { h: "Vencido", p: "SLA estourado. Entra no escalonamento no mesmo dia e aparece no relatório de retrô.", c: "var(--red)" },
  { h: "Bloqueado pelo cliente", p: "A conta pausa o relógio interno e o cliente vê exatamente o que está travando. O atraso fica atribuído corretamente.", c: "var(--dim)" },
];

export const ESCAL = {
  cols: ["Situação", "Primeiro nível", "Prazo", "Se não resolver"],
  rows: [
    ["Etapa interna vencida", "Dono da etapa + Ana", "Mesmo dia", "Ana replaneja e comunica o novo prazo ao cliente"],
    ["Cliente não aprova em 2 dias", "Adriane cobra no grupo", "D+1", "Ana liga; D+3 a fase é replanejada oficialmente"],
    ["Cliente falta à gravação", "Adriane reagenda", "24h", "Segunda falta consome a gravação do ciclo — cláusula do contrato"],
    ["Acesso não enviado", "Adriane cobra com lista", "48h", "Ana escala ao decisor; tráfego fica bloqueado e visível"],
    ["Pagamento de anúncio não compensa", "Pedro notifica Ana", "24h", "Campanhas seguem pausadas — o cliente vê o motivo na plataforma"],
    ["Segunda rodada de ajuste pedida", "Gabriel avalia o pedido", "24h", "Ana decide se entra no escopo ou vira próximo ciclo"],
  ],
};

export const RISCOS = {
  cols: ["Risco", "Impacto na entrega", "Resposta do sistema"],
  rows: [
    ["Cliente falta ou atrasa a gravação", "Toda a esteira de pós-produção e publicação desloca", "Dupla confirmação em D-1 e H-1 + cláusula de reagendamento única"],
    ["Atraso na validação de roteiros e edições", "Empurra o cronograma técnico do ciclo inteiro", "SLA de 2 dias visível ao cliente, com recálculo público do cronograma"],
    ["Falta de material bruto novo", "Criativo envelhece e a performance do tráfego cai", "Nova remessa de roteiros disparada em D+35, antes do lote acabar"],
    ["Acessos não liberados", "Trava tráfego, auditoria e publicação de uma vez", "Etapa de validação por login, não por recebimento de senha"],
    ["Feedback fragmentado no WhatsApp", "Retrabalho e versão errada indo ao ar", "Aprovação centralizada na plataforma, com histórico"],
    ["Handoff comercial incompleto", "Promessa de venda não bate com a entrega", "Reunião de passagem obrigatória em 24h, com notas registradas"],
  ],
};

export const BASE_MENSAL = [
  "9 roteiros estratégicos", "Dia de Gravação Expand — 8 a 9 vídeos", "Edição, QC interno e sua aprovação",
  "Legendas e copys de apoio", "Calendário editorial e agendamento", "Publicação recorrente no perfil",
  "Gestão e otimização diária do tráfego", "Relatório mensal de performance", "Reunião estratégica mensal",
];

// Trilha da jornada do cliente — rótulo + fase até a qual o passo vai
export const TRACK: { l: string; ate: number }[] = [
  { l: "Contrato", ate: 2 }, { l: "Onboarding", ate: 3 }, { l: "Diagnóstico", ate: 4 },
  { l: "Estratégia", ate: 5 }, { l: "Posicionamento", ate: 6 }, { l: "Roteiros", ate: 7 },
  { l: "Gravação", ate: 8 }, { l: "Edição", ate: 9 }, { l: "Publicação", ate: 10 }, { l: "Resultados", ate: 14 },
];

export const CLI_DEVERES: { h: string; p: string }[] = [
  { h: "Aprovar em até 2 dias", p: "Roteiros e vídeos têm janela de 2 dias para o seu retorno. Passou o prazo, a entrega segue e o cronograma é recalculado aqui, com a nova data visível." },
  { h: "Comparecer ao Dia de Gravação", p: "Sessão mensal de cerca de 2 horas, com a equipe dirigindo ao vivo. É o único ponto do processo que não roda sem você. Reagendamento: uma vez por ciclo." },
  { h: "Feedback em uma rodada só", p: "Junte todos os ajustes e envie de uma vez, pela plataforma. Feedback fragmentado gera versão errada no ar e atrasa o lote inteiro." },
  { h: "Manter os bastidores rodando", p: "Além dos vídeos do lote, mande o material bruto de bastidor que a equipe pedir. É o que mantém o criativo novo e o custo do tráfego sob controle." },
];

export const MESES: { m: number; nm: string; foco: string; mk: string }[] = [
  { m: 1, nm: "Implantação", foco: "Montar a base: diagnóstico, posicionamento, primeiro lote de conteúdo e tráfego no ar.", mk: "Método END implantado" },
  { m: 2, nm: "Primeiro ciclo completo", foco: "Primeira leitura real de performance e captação das primeiras provas sociais.", mk: "1º lote de provas sociais" },
  { m: 3, nm: "Fechamento do Trimestre 1", foco: "Ler o que os três primeiros meses mostraram e corrigir o funil com dado, não com achismo.", mk: "Relatório trimestral" },
  { m: 4, nm: "Revisão de oferta", foco: "Ajustar a mensagem de fundo de funil com base em quem já chegou até a conversa.", mk: "Novos criativos de conversão" },
  { m: 5, nm: "Expansão de públicos", foco: "Abrir novas frentes de audiência sobre a base que já provou converter.", mk: "2º lote de provas sociais" },
  { m: 6, nm: "Meio de contrato", foco: "Parada estratégica: o posicionamento ainda está certo? A operação escala do jeito que está?", mk: "Revisão semestral" },
  { m: 7, nm: "Escala", foco: "Com o custo por reunião validado, aumentar a verba onde o retorno já está provado.", mk: "Escala de verba" },
  { m: 8, nm: "Novo formato", foco: "Renovar o formato do conteúdo antes que a audiência canse do que já viu.", mk: "Nova série de conteúdo" },
  { m: 9, nm: "Fechamento do Trimestre 3", foco: "Terceira leitura trimestral, já com base histórica para comparar.", mk: "Relatório trimestral" },
  { m: 10, nm: "Case da marca", foco: "Transformar o resultado do próprio cliente em material de venda dele.", mk: "Case study produzido" },
  { m: 11, nm: "Consolidado anual", foco: "Fechar a conta do ano e desenhar o próximo ciclo antes da conversa de renovação.", mk: "Consolidado de 12 meses" },
  { m: 12, nm: "Encerramento e renovação", foco: "Apresentar o que foi construído e decidir junto como segue.", mk: "Reunião de fechamento" },
];
