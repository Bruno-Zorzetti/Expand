// Esteira do PIDE — 15 fases, tarefas com dono/SLA/gatilho/critério e agente de IA.
// Template estático (definição do processo). O estado por cliente vem de expand_clientes.

export type Etapa = {
  t: string;   // título da tarefa
  o: string;   // responsável (dono humano)
  a: string;   // área (chave)
  sla: string;
  g: string;   // gatilho
  d: string;   // critério de conclusão
  cli: 0 | 1;  // visível/toca o cliente
  ag?: string; // slug do agente de IA que executa (humano aprova)
};
export type Fase = { id: number; nome: string; janela: string; obj: string; tasks: Etapa[] };

export const AREAS: Record<string, { n: string; cor: string }> = {
  cm: { n: "Comercial", cor: "#CE6A5F" },
  pm: { n: "PM", cor: "#C89B5E" },
  cs: { n: "CS", cor: "#E6D0A8" },
  av: { n: "Audiovisual", cor: "#6FBF92" },
  sm: { n: "Social", cor: "#86C0A6" },
  tf: { n: "Tráfego", cor: "#CE7F4C" },
  cl: { n: "Cliente", cor: "#8A9990" },
};

export const AG_COR: Record<string, string> = {
  lara: "#E0BC85", sofia: "#86C0A6", alan: "#E6D0A8", nina: "#5FA37E",
};
export const AG_NOME: Record<string, string> = {
  lara: "Lara", sofia: "Sofia", alan: "Alan", nina: "Nina",
};
export const AG_APROVA: Record<string, string> = {
  lara: "Ana revisa e publica", sofia: "Vinicius aprova e aplica",
  alan: "Ana e Gabriel revisam", nina: "Gabriel valida no QC",
};

// posição (fase) estimada por maturidade, enquanto não há etapa exata por cliente
export const MAT_FASE: Record<string, number> = {
  "Estruturação": 6, "Validação": 9, "Otimização": 13, "Escala": 15,
};

export const FASES: Fase[] = [
  { id: 1, nome: "Fechamento e Handoff", janela: "D0", obj: "Transferir o cliente do Comercial para a Entrega sem perder contexto.", tasks: [
    { t: "Solicitar dados cadastrais para o contrato", o: "Comercial", a: "cm", sla: "No ato", g: "Venda fechada", d: "Ficha de venda preenchida no CRM", cli: 1 },
    { t: "Enviar instruções de pagamento", o: "Comercial", a: "cm", sla: "No ato", g: "Ficha preenchida", d: "Cliente confirmou recebimento", cli: 1 },
    { t: "Reunião de passagem Comercial → PM (15 min)", o: "Comercial + Ana", a: "cm", sla: "24h", g: "Venda fechada", d: "Notas da venda no Notion: promessa, expectativa, objeções, perfil", cli: 0 },
  ] },
  { id: 2, nome: "Ativação da Conta", janela: "D0–D1", obj: "Abrir o canal, formalizar o contrato e montar a estrutura de arquivos.", tasks: [
    { t: "Criar grupo oficial com o cliente", o: "Ana", a: "pm", sla: "24h", g: "Handoff concluído", d: "Grupo criado com cliente, Ana, Adriane e Pedro", cli: 1 },
    { t: "Emitir e enviar o contrato", o: "Ana", a: "pm", sla: "1 dia útil", g: "Dados cadastrais recebidos", d: "Contrato enviado para assinatura eletrônica", cli: 1 },
    { t: "Criar pasta no Drive e subir documentos iniciais", o: "Ana", a: "pm", sla: "Na assinatura", g: "Contrato assinado", d: "Estrutura padrão de pastas criada", cli: 0 },
    { t: "Montar o ecossistema do cliente no Notion", o: "Ana + Adriane", a: "pm", sla: "Na assinatura", g: "Contrato assinado", d: "Board da conta criado a partir do template PIDE", cli: 0 },
    { t: "Criar a view personalizada do cliente", o: "Adriane", a: "cs", sla: "Na assinatura", g: "Ecossistema montado", d: "Link de acompanhamento gerado e testado", cli: 1 },
    { t: "Validar o pagamento", o: "Pedro", a: "cm", sla: "24h", g: "Comprovante enviado", d: "Pagamento confirmado no financeiro", cli: 1 },
    { t: "Follow-up de pendências contratuais ou financeiras", o: "Adriane", a: "cs", sla: "24h · se houver", g: "Contrato ou pagamento em aberto", d: "Pendência resolvida ou escalada para Pedro", cli: 0 },
  ] },
  { id: 3, nome: "Onboarding", janela: "D1–D5", obj: "Fazer o cliente entender como a agência funciona e o que se espera dele.", tasks: [
    { t: "Boas-vindas e alinhamento inicial", o: "Adriane", a: "cs", sla: "Mesmo dia", g: "Grupo criado", d: "Mensagem enviada e respondida pelo cliente", cli: 1 },
    { t: "Enviar as instruções de funcionamento", o: "Adriane", a: "cs", sla: "Mesmo dia", g: "Boas-vindas enviadas", d: "Cliente ciente da dinâmica e dos prazos dele", cli: 1 },
    { t: "Enviar o formulário de onboarding", o: "Adriane", a: "cs", sla: "Mesmo dia", g: "Instruções enviadas", d: "Link entregue no grupo", cli: 1 },
    { t: "Monitorar preenchimento e validar respostas", o: "Adriane", a: "cs", sla: "1 dia após retorno", g: "Formulário respondido", d: "Respostas conferidas e lacunas cobradas", cli: 0 },
    { t: "Agendar a reunião de diagnóstico", o: "Adriane", a: "cs", sla: "Até 5 dias da assinatura", g: "Pagamento validado", d: "Data confirmada nos dois calendários", cli: 1 },
    { t: "Confirmar presença (D-1 e H-1)", o: "Adriane", a: "cs", sla: "D-1 e H-1", g: "Reunião agendada", d: "Confirmação explícita do cliente", cli: 0 },
    { t: "Check-in de onboarding e envio do roadmap inicial", o: "Adriane", a: "cs", sla: "Antes do diagnóstico", g: "Formulário validado", d: "Roadmap focado nos objetivos publicado na view do cliente", cli: 1 },
  ] },
  { id: 4, nome: "Diagnóstico", janela: "D5", obj: "Extrair tudo que a estratégia precisa e travar as expectativas ao vivo.", tasks: [
    { t: "Conduzir a reunião de diagnóstico (gravação obrigatória)", o: "Ana + Adriane", a: "pm", sla: "Até D5", g: "Presença confirmada", d: "Gravação salva no Drive da conta", cli: 1 },
    { t: "Levantamento de público, ofertas e metas", o: "Ana", a: "pm", sla: "Na reunião", g: "Reunião iniciada", d: "Bloco de estratégia preenchido no Notion", cli: 0 },
    { t: "Alinhamento de expectativas ao vivo", o: "Adriane", a: "cs", sla: "Na reunião", g: "Reunião iniciada", d: "Cliente ouviu prazos, obrigações e o que não está no escopo", cli: 1 },
    { t: "Apresentar o roadmap e os próximos passos", o: "Ana + Adriane", a: "pm", sla: "Na reunião", g: "Diagnóstico feito", d: "Cronograma publicado na view do cliente", cli: 1 },
    { t: "Solicitar acessos de redes e contas", o: "Adriane", a: "cs", sla: "Imediatamente após", g: "Reunião encerrada", d: "Pedido formal com a lista completa", cli: 1 },
    { t: "Testar e confirmar cada acesso recebido", o: "Ana", a: "pm", sla: "24h", g: "Acessos enviados", d: "Login validado em cada plataforma — não basta receber, tem que entrar", cli: 0 },
  ] },
  { id: 5, nome: "Inteligência Estratégica", janela: "D5–D7", obj: "Transformar o diagnóstico em documento de trabalho para todo o time.", tasks: [
    { t: "Estudo de Mercado", o: "Ana", a: "pm", sla: "2 dias após diagnóstico", g: "Diagnóstico concluído", d: "Documento aprovado internamente", cli: 1, ag: "lara" },
    { t: "Estudo de Público", o: "Ana", a: "pm", sla: "2 dias após diagnóstico", g: "Diagnóstico concluído", d: "Personas e dores mapeadas", cli: 1, ag: "lara" },
    { t: "Dossiê Estratégico", o: "Ana", a: "pm", sla: "2 dias após diagnóstico", g: "Estudos concluídos", d: "Dossiê publicado e time notificado", cli: 1, ag: "lara" },
    { t: "Publicar no Notion e notificar Gabriel, Vinicius e Redação", o: "Ana", a: "pm", sla: "Mesmo dia", g: "Dossiê pronto", d: "Todos com acesso antes de qualquer produção começar", cli: 0 },
  ] },
  { id: 6, nome: "Posicionamento e Perfil", janela: "D7–D10", obj: "Deixar o perfil pronto para receber o conteúdo e o tráfego.", tasks: [
    { t: "Auditoria das redes atuais", o: "Vinicius", a: "sm", sla: "2 dias após diagnóstico", g: "Acessos validados", d: "Relatório de auditoria no Notion", cli: 1, ag: "sofia" },
    { t: "Nova bio estratégica e proposta de posicionamento", o: "Vinicius", a: "sm", sla: "2 dias", g: "Auditoria concluída", d: "Proposta revisada por Ana antes de sair", cli: 0, ag: "sofia" },
    { t: "Enviar a proposta de posicionamento ao cliente", o: "Ana", a: "pm", sla: "Assim que finalizada", g: "Proposta revisada", d: "Enviada pela plataforma com prazo de resposta", cli: 1 },
    { t: "Aprovação do cliente", o: "Cliente", a: "cl", sla: "2 dias", g: "Proposta recebida", d: "Aprovação ou ajustes registrados", cli: 1 },
    { t: "Aplicar as mudanças no perfil", o: "Vinicius", a: "sm", sla: "24h após aprovação", g: "Proposta aprovada", d: "Perfil atualizado e print anexado", cli: 1 },
  ] },
  { id: 7, nome: "Roteirização", janela: "D7–D12", obj: "Nove roteiros alinhados à estratégia e à direção audiovisual.", tasks: [
    { t: "Solicitar a criação dos roteiros", o: "Ana", a: "pm", sla: "2 dias após o dossiê", g: "Dossiê publicado", d: "Briefing de roteiro aberto para a Redação", cli: 0 },
    { t: "Desenvolver os 9 roteiros estratégicos", o: "Redação", a: "av", sla: "2 dias (+2 de ajuste)", g: "Briefing recebido", d: "9 roteiros na pasta, prontos para direção", cli: 1, ag: "alan" },
    { t: "Alinhar a escrita com a direção audiovisual", o: "Gabriel", a: "av", sla: "1 dia", g: "Roteiros entregues", d: "Cada roteiro com nota de direção e formato definido", cli: 0 },
    { t: "Revisar e enviar os roteiros ao cliente", o: "Ana", a: "pm", sla: "1 dia", g: "Direção alinhada", d: "Roteiros enviados pela plataforma", cli: 1 },
    { t: "Aprovação dos roteiros pelo cliente", o: "Cliente", a: "cl", sla: "2 dias", g: "Roteiros recebidos", d: "Aprovação registrada — libera o agendamento da gravação", cli: 1 },
  ] },
  { id: 8, nome: "Dia de Gravação Expand", janela: "D12–D18", obj: "Captar o material com o cliente dirigido ao vivo.", tasks: [
    { t: "Agendar a data de gravação", o: "Ana + Adriane", a: "pm", sla: "Até 6 dias da aprovação", g: "Roteiros aprovados", d: "Data confirmada com cliente e videomaker", cli: 1 },
    { t: "Alinhamento técnico com o videomaker", o: "Gabriel", a: "av", sla: "D-1 da gravação", g: "Data confirmada", d: "Roteiro, formato e equipamento revisados", cli: 0 },
    { t: "Confirmar presença do cliente (D-1 e H-1)", o: "Adriane", a: "cs", sla: "D-1 e H-1", g: "Data confirmada", d: "Confirmação explícita — ausência é o maior fator de atraso", cli: 1 },
    { t: "Executar a captação", o: "Videomaker", a: "av", sla: "Data agendada", g: "Alinhamento feito", d: "Todos os 9 roteiros captados", cli: 1 },
    { t: "Subir os brutos no Drive e notificar o time", o: "Videomaker", a: "av", sla: "Mesmo dia", g: "Captação encerrada", d: "Brutos na pasta e Gabriel notificado", cli: 0 },
  ] },
  { id: 9, nome: "Pós-produção", janela: "D18–D22", obj: "Entregar os vídeos prontos com um único ciclo de ajuste.", tasks: [
    { t: "Editar e finalizar a primeira versão", o: "Editores (Gabriel)", a: "av", sla: "2 dias após os brutos", g: "Brutos disponíveis", d: "Primeira versão de todos os vídeos", cli: 1, ag: "nina" },
    { t: "Revisão técnica interna (QC)", o: "Gabriel", a: "av", sla: "1 dia", g: "Edição concluída", d: "Nada sai sem passar pelo QC — corte, áudio, legenda, marca", cli: 0 },
    { t: "Enviar os vídeos para validação do cliente", o: "Ana", a: "pm", sla: "Mesmo dia do QC", g: "QC aprovado", d: "Vídeos publicados na plataforma para aprovação", cli: 1 },
    { t: "Aprovação ou feedback do cliente", o: "Cliente", a: "cl", sla: "2 dias", g: "Vídeos recebidos", d: "Feedback consolidado em uma única rodada", cli: 1 },
    { t: "Executar os ajustes solicitados", o: "Editores (Gabriel)", a: "av", sla: "2 dias", g: "Feedback recebido", d: "Ajustes entregues — segunda rodada só em exceção", cli: 1 },
  ] },
  { id: 10, nome: "Publicação", janela: "D22–D25", obj: "Colocar o conteúdo no ar com calendário e copy estratégicos.", tasks: [
    { t: "Redigir legendas e copys de apoio", o: "Redação", a: "av", sla: "2 dias após aprovação", g: "Vídeos 100% aprovados", d: "Copy de cada vídeo com um único CTA", cli: 0, ag: "alan" },
    { t: "Montar o calendário editorial e agendar as postagens", o: "Vinicius", a: "sm", sla: "2 dias", g: "Copys prontas", d: "Calendário publicado na view do cliente", cli: 1, ag: "sofia" },
    { t: "Conferir as publicações no ar", o: "Vinicius", a: "sm", sla: "No dia de cada post", g: "Agendamento feito", d: "Post publicado corretamente e sem erro de formato", cli: 0 },
  ] },
  { id: 11, nome: "Tráfego Pago", janela: "Paralelo · D5–D25", obj: "Estrutura pronta antes dos criativos e campanhas no ar logo depois.", tasks: [
    { t: "Estruturar BM, conta de anúncios e pixel", o: "Ana", a: "tf", sla: "3 dias após os acessos", g: "Acessos validados", d: "Pixel disparando e conta apta a veicular", cli: 1 },
    { t: "Enviar o boleto ou guia de investimento", o: "Ana", a: "tf", sla: "3 dias após vídeos prontos", g: "Vídeos aprovados", d: "Guia enviado com prazo de compensação", cli: 1 },
    { t: "Confirmar a compensação do pagamento", o: "Pedro", a: "cm", sla: "24h", g: "Comprovante enviado", d: "Verba disponível na conta de anúncios", cli: 1 },
    { t: "Subir e estruturar as campanhas", o: "Ana", a: "tf", sla: "2 dias após compensação", g: "Verba disponível", d: "Funil de 3 camadas no ar: topo 50%, fundo 40%, meio 10%", cli: 1 },
    { t: "Otimização diária das campanhas", o: "Ana", a: "tf", sla: "Diário", g: "Campanhas no ar", d: "Registro de otimização no board da conta", cli: 1 },
  ] },
  { id: 12, nome: "Provas Sociais", janela: "Após o 1º lote", obj: "Capturar depoimentos para alimentar o segundo lote de conteúdo.", tasks: [
    { t: "Mapear e solicitar indicações ao cliente", o: "Ana", a: "pm", sla: "Após o 1º lote entregue", g: "Primeiro lote publicado", d: "Lista de indicados com contato", cli: 1 },
    { t: "Agendar a gravação dos depoimentos", o: "Ana", a: "pm", sla: "7 dias após a indicação", g: "Indicações recebidas", d: "Datas confirmadas com os indicados", cli: 1 },
    { t: "Produzir e finalizar os materiais de depoimento", o: "Gabriel", a: "av", sla: "4 dias após a captação", g: "Brutos disponíveis", d: "Depoimentos entregues e aprovados", cli: 1 },
  ] },
  { id: 13, nome: "Ciclo Mensal Recorrente", janela: "D30+", obj: "Manter a esteira girando sem depender de cobrança.", tasks: [
    { t: "Desenvolver a nova remessa de roteiros", o: "Redação", a: "av", sla: "35–40 dias do lote anterior", g: "Lote anterior aprovado", d: "Nova remessa pronta antes do lote acabar", cli: 1, ag: "alan" },
    { t: "Gravação mensal de 8 a 9 novos vídeos", o: "Videomaker", a: "av", sla: "Mensal", g: "Roteiros aprovados", d: "Captação concluída — reinicia o fluxo de pós-produção", cli: 1 },
    { t: "Publicação recorrente conforme o calendário", o: "Vinicius", a: "sm", sla: "Contínuo", g: "Calendário aprovado", d: "Cadência mantida sem buraco", cli: 1, ag: "sofia" },
    { t: "Atualização de criativos nas campanhas", o: "Ana", a: "tf", sla: "A cada novo lote", g: "Novos vídeos aprovados", d: "Criativos antigos pausados, novos no ar", cli: 1 },
  ] },
  { id: 14, nome: "Relatório e Reunião Mensal", janela: "Fim de cada ciclo", obj: "Mostrar o que aconteceu e decidir o que muda.", tasks: [
    { t: "Compilar o relatório mensal de performance", o: "Adriane + Ana", a: "cs", sla: "Até o dia 30 do ciclo", g: "Ciclo encerrado", d: "Relatório com visão macro entregue ao cliente", cli: 1, ag: "alan" },
    { t: "Conduzir a reunião estratégica mensal", o: "Ana + Adriane", a: "cs", sla: "Mensal", g: "Relatório entregue", d: "Reunião realizada e gravada", cli: 1 },
    { t: "Registrar os ajustes de rota", o: "Ana", a: "pm", sla: "24h após a reunião", g: "Reunião encerrada", d: "Decisões no board — o próximo ciclo já nasce ajustado", cli: 0 },
  ] },
  { id: 15, nome: "Encerramento e Renovação", janela: "D-5 do fim do contrato", obj: "Chegar na renovação com o resultado já apresentado.", tasks: [
    { t: "Agendar a reunião de fechamento", o: "Comercial + Adriane + Ana", a: "cm", sla: "5 dias antes do fim", g: "Contrato próximo do término", d: "Reunião marcada com os três presentes", cli: 1 },
    { t: "Apresentar o consolidado de resultados", o: "Adriane", a: "cs", sla: "Na reunião", g: "Reunião iniciada", d: "Evolução da marca, métricas e saúde da conta", cli: 1 },
    { t: "Apresentar a proposta de continuidade", o: "Adriane + Comercial", a: "cm", sla: "Na reunião", g: "Resultados apresentados", d: "Nova proposta e roadmap do próximo período", cli: 1 },
  ] },
];

export const GATES = [
  { h: "Portão 1 — Conta Ativa", p: "Contrato assinado, pagamento validado, grupo criado e pasta no Drive montada. Sem os quatro, o Onboarding não começa. Dono: Ana." },
  { h: "Portão 2 — Contexto Completo", p: "Formulário respondido, diagnóstico gravado e todos os acessos testados com login efetivo. Sem isso, a Inteligência Estratégica não começa. Dono: Adriane." },
  { h: "Portão 3 — Estratégia Publicada", p: "Estudo de Mercado, Estudo de Público e Dossiê no Notion, com Gabriel, Vinicius e Redação notificados. Nenhuma produção começa antes. Dono: Ana." },
  { h: "Portão 4 — Roteiros Aprovados", p: "Os 9 roteiros aprovados pelo cliente e com nota de direção. Só então a data de gravação é travada. Dono: Ana." },
  { h: "Portão 5 — Vídeos Aprovados", p: "QC interno feito e aprovação do cliente registrada. Libera copy, calendário, publicação e a troca de criativos no tráfego. Dono: Gabriel." },
];

export const TOTAL_ETAPAS = FASES.reduce((n, f) => n + f.tasks.length, 0);
