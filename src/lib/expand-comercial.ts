// Sistema Comercial da Expand — método 3F, funis, objeções, agenda e a Lara na prospecção.
// Conteúdo de treinamento do time comercial (estático). Scripts em HTML → render com dangerouslySetInnerHTML.

export type Mov = { i: string; mn: string; md: string; s: string };
export type Etapa3F = { n: string; nome: string; meta: string; movs: Mov[] };
export type Funil = { tag: string; cor: string; nome: string; fluxo: string; msgs: { n: string; t: string; s: string }[] };
export type Objecao = { q: string; t: string; s: string; z: string };

export const ETAPAS: Etapa3F[] = [
  {
    n: "01", nome: "Conexão e Diagnóstico", meta: "Elogio, sondagem, dor, sonho e história · 20 a 25 min · aqui só se pergunta",
    movs: [
      { i: "1", mn: "Elogiar e abrir", md: "Conecta, promete falar de si — e devolve a pergunta. Nunca comece falando da Expand.",
        s: `Muito prazer, <em>Fulano</em>. Parabéns pelo trabalho que vocês vêm fazendo, dá pra ver que a empresa está em movimento. Eu já falo um pouco da minha jornada pra você me conhecer melhor — agora, só pra eu entender e conseguir te ajudar de verdade, e a gente ser bem cirúrgico aqui:
        <span class="nota"><b>Por que assim:</b> a abertura entrega reconhecimento, promessa de reciprocidade e comando da conversa em quinze segundos. Quem termina a fala com uma pergunta fica com o volante.</span>` },
      { i: "2", mn: "Sondagem", md: "O bloco mais importante. Cada resposta vira munição no fechamento.",
        s: `Me fala um pouco da empresa: o que vocês vendem, qual o ticket do serviço, quanto faturam em média por mês. Me conta do time — quantas pessoas, tem alguém de marketing? E o principal: <em>como o cliente chega até vocês hoje?</em>
        <span class="resp">R: Ah, a maioria vem por indicação mesmo...</span>
        <span class="nota"><b>Escute a palavra "indicação".</b> Quando ela aparece o diagnóstico está feito — mas não comemore e não pule para a solução. Anote e continue perguntando. A dor precisa sair da boca dele.</span>
        <span class="nota"><b>Perguntas de apoio:</b> Já fizeram marketing antes? Como foi? Tem mês que vende bem e mês que não vende? Quanto isso varia?</span>` },
      { i: "3", mn: "Estado desejado", md: "O sonho. É o que se cita de volta no fechamento.",
        s: `O que você está buscando mais hoje, pensando na empresa e também na sua vida? Onde você quer esse negócio daqui a um ano?
        <span class="nota"><b>Anote literalmente</b> as palavras dele. No F1 você devolve a frase dele, não a sua. "Você me disse que queria parar de trabalhar sábado" pesa mais que qualquer argumento.</span>` },
      { i: "4", mn: "Conscientizar sem entregar", md: "Você já viu o problema. Não fale ainda.",
        s: `Com você falando eu percebi algumas coisas. Agora, pra eu não te influenciar, quero ouvir de você:` },
      { i: "5", mn: "Confirmar a dor", md: "Deixa ele nomear o problema. É o que trava a objeção lá na frente.",
        s: `O que mais te incomoda hoje pensando na gestão, no posicionamento e nas vendas da empresa?
        <span class="resp">R: É que eu não sei quanto vou faturar no mês que vem.</span>` },
      { i: "6", mn: "O maior desafio", md: "Fecha o diagnóstico e hierarquiza.",
        s: `Qual o seu maior desafio hoje? Existe algum outro além desse que a gente identificou?
        <span class="nota"><b>Se travar:</b> O que você mudaria positivamente pros próximos meses? · Qual o cenário ideal daqui a um ano? · Se nada mudasse, o que aconteceria com a empresa?</span>` },
      { i: "7", mn: "Contar a história", md: "1 a 2 minutos. Entra quando a reunião ficar unilateral — e sai devolvendo a pergunta.",
        s: `Deixa eu te contar um pouco da minha jornada pra você me conhecer melhor e eu já volto pra você.
        <span class="nota"><b>Estrutura Expand:</b> dez anos de audiovisual e mais de três mil vídeos → percebemos que empresa boa não morria por falta de vídeo, morria por falta de processo comercial → estruturamos o Método END → mais de trinta empresas atendidas e mais de dois milhões em vendas gerados. <b>Termine devolvendo:</b> "E você, me conta um pouco da sua jornada?"</span>
        <span class="nota alerta"><b>Se ele tentar dominar:</b> "Muito boa sua pergunta, faz sentido, eu já te respondo — agora me fala uma coisa pra eu me localizar." E volte à sua pergunta. Menos de 10% insistem.</span>` },
    ],
  },
  {
    n: "02", nome: "Detalhar e Gerar Valor", meta: "Dimensiona a dor, mostra o caminho, entrega ouro — sem falar do PIDE · 10 a 15 min",
    movs: [
      { i: "1", mn: "Dimensão da dor", md: "Opcional. Use com quem parecer pouco consciente ou já resistente.",
        s: `Você concorda que se a empresa não trabalhar esse cenário, daqui a seis meses, um ano, a tendência é que as coisas estejam parecidas — ou piores? Faz sentido?` },
      { i: "2", mn: "O caminho em três passos", md: "Compartilhe a tela e desenhe ao vivo.",
        s: `O caminho é trabalhar três coisas nessa ordem: <em>posicionamento, produção de conteúdo e processo de vendas</em>. E é nessa ordem por um motivo: conteúdo sem posicionamento atrai o cliente errado — e cliente errado dá trabalho e não paga bem.
        <span class="nota"><b>Escreva na tela.</b> O valor percebido de um mapa construído na frente dele é incomparável ao de um slide pronto. Ele está vendo você pensar sobre o negócio dele.</span>` },
      { i: "3", mn: "Gerar valor de verdade", md: "7 a 10 min entregando ouro. Faz a reunião valer mesmo sem venda.",
        s: `<b class="hl">Sobre vendas:</b> você não pode depender só de indicação — e não é só pela instabilidade. Quando o cliente chega indicado, ele já vem com um valor na cabeça, ancorado no que o outro pagou. Você fica preso no preço. Pra ter previsibilidade e subir o ticket, precisa de processo ativo.
        <br><br><b class="hl">Sobre posicionamento:</b> olhando o perfil de vocês — e vou falar direto porque ajuda mais — existe conteúdo, existe esforço. Mas o perfil não diz em cinco segundos pra quem vocês vendem nem o que resolvem. Quem chega não entende, e quem não entende não chama.
        <br><br><b class="hl">O exemplo numérico:</b> se hoje vocês faturam <em>R$ 100 mil</em> com ticket de <em>R$ 8 mil</em>, fechar quatro clientes a mais por mês vindos do digital são <em>R$ 32 mil a mais por mês</em> — sem depender de quem indica. É um exemplo, pode ser mais ou menos.
        <span class="nota"><b>Use os números dele.</b> O exemplo só funciona com o ticket e o faturamento que ele te deu. Número genérico soa a pitch; número dele soa a diagnóstico.</span>
        <span class="nota alerta"><b>Não fale do PIDE ainda.</b> Aqui se fala dos temas, nunca do produto. Se ele perguntar "e como vocês fazem?", responda: "Já te explico exatamente — antes só quero entender mais uma coisa." E volte a perguntar.</span>` },
      { i: "4", mn: "Prova social", md: "Case do mesmo porte, de preferência do mesmo segmento.",
        s: `Inclusive tenho cliente que vivia esse mesmo desafio. A <em>LM Eventos</em> faturava cerca de R$ 100 mil por mês, tinha Instagram mas sem estratégia, e vivia de indicação. Hoje o digital gera cliente todo mês.
        <span class="nota"><b>Ativos de autoridade:</b> mais de R$ 2 milhões gerados para clientes · mais de 30 empresas atendidas · 10 anos de audiovisual · mais de 3.000 vídeos. Use um ou dois, nunca a lista inteira.</span>` },
    ],
  },
  {
    n: "03", nome: "F1 · Fechamento", meta: 'Os 3 sins, a PAV e a decisão imediata — é aqui que se fecha a porta do "vou pensar"',
    movs: [
      { i: "1", mn: "Confirmação dos 3 sins", md: "Acene com a cabeça enquanto pergunta. A resposta precisa parecer óbvia.",
        s: `Se daqui a dois meses você puder aplicar tudo isso e já melhorar esses desafios — <em>parar de depender de indicação, ter previsibilidade de cliente</em> — isso seria positivo pra empresa? Sim ou não?
        <br><br>Imagina a empresa fechando <em>R$ 30 mil a mais por mês</em> vindos do digital, além do que já faz. Ajuda? Sim ou não?
        <span class="nota"><b>Cite o objetivo da Etapa 01</b> com as palavras dele. Se ele disse "queria parar de me preocupar todo dia 1", use exatamente isso.</span>` },
      { i: "2", mn: "PAV · Pergunta Antes da Venda", md: "A pergunta que autoriza a oferta. Sem ela, a oferta chega como investida.",
        s: `Então faz sentido pra você trabalhar tudo isso, pra resolver esse problema <em>(cite a dor)</em> e chegar nesse objetivo <em>(cite o desejo)</em>?
        <span class="resp">R: Faz sentido sim.</span>` },
      { i: "3", mn: "Mostrar os resultados", md: "Antes da oferta, abra a tela. Prova antes de preço.",
        s: `Antes de eu te explicar como funciona, deixa eu te mostrar rapidinho.
        <span class="nota"><b>O que abrir:</b> perfil do cliente antes e depois · print de resultado comercial · depoimento em vídeo. Nunca abra a oferta sem ter mostrado prova.</span>` },
      { i: "4", mn: "Decisão imediata", md: 'Fecha a porta do talvez. Sem isso, o "vou pensar" é quase certo.',
        s: `<em>Fulano</em>, muito legal o projeto de vocês, tô vendo que dá pra ajudar bastante. Vamos fazer o seguinte: eu vou te explicar como funciona a nossa implementação, mas vamos combinar uma coisa. Se você não se identificar, tudo bem, seguimos como colegas de jornada. Agora, se fizer sentido — e se vocês forem aprovados, porque eu vou fazer algumas perguntas — a gente já fecha. Porque a nossa equipe entra junto com o cliente, não é curso nem mentoria, então escolhemos poucas empresas por mês. <em>Posso contar com a sua objetividade, seja pro sim ou pro não?</em>
        <span class="nota alerta"><b>Se a resposta vier morna,</b> repita com mais ênfase. O que importa não é o que você falou — é o que ele entendeu. E aqui ele precisa entender que "vou pensar" não é uma opção combinada.</span>` },
    ],
  },
  {
    n: "04", nome: "Oferta e Fechamento", meta: "Ancoragem, dicotômica, inversão da venda e pagamento · 15 a 20 min",
    movs: [
      { i: "1", mn: "Ancoragem", md: "Compartilhe a tela e escreva os valores de cima para baixo, na hora.",
        s: `Deixa eu te mostrar como a gente trabalha. Temos três formatos.
        <span class="nota"><b>Ordem obrigatória:</b> comece pelo <b>PIDE Prime</b> (âncora), depois o <b>Anual</b>, depois o <b>Semestral</b>. O primeiro número reajusta a régua de tudo que vem depois.</span>
        <span class="nota">Feche amarrando: "E essa implementação vai trabalhar exatamente pra resolver o que a gente falou <em>(cite o problema)</em> e chegar no <em>(cite o objetivo)</em>."</span>` },
      { i: "2", mn: "Pergunta dicotômica", md: 'Nunca pergunte "o que achou". Pergunte qual dos dois.',
        s: `<em>Qual faz mais sentido pra você: o Anual ou o Semestral?</em>
        <span class="nota alerta"><b>Não ofereça três na decisão.</b> A âncora serviu para ancorar; agora escolhe-se entre dois. Três opções na hora de decidir produzem adiamento, não escolha.</span>` },
      { i: "3", mn: "Inversão da venda", md: "Não é gatilho — é seleção real. Faça sempre, mesmo com o sim na mesa.",
        s: `Ok, <em>Fulano</em>, agora uma pergunta importante que eu faço pra 100% das empresas que entram com a gente. Todo cliente vira parte do nosso time — a nossa equipe entra dentro da operação de vocês, roteiriza, dirige, edita, sobe campanha. O resultado de vocês é o nosso resultado, e é o que mostramos pro mercado. Então cada empresa precisa estar alinhada de verdade. <em>Por que eu devo aprovar vocês? Quero ouvir de você.</em>` },
      { i: "4", mn: "Analisar o novo cliente", md: "Calibra expectativa antes do contrato — evita o cliente insatisfeito no mês 3.",
        s: `Ótimo. Vocês entrando hoje, nas primeiras semanas, o que precisa acontecer pra você dar nota 10 e ficar totalmente satisfeito?
        <span class="resp">R: Se eu fechar um cliente pelo digital eu já fico feliz.</span>
        <span class="nota"><b>Se a resposta for irreal</b> ("dobrar o faturamento em 30 dias"), calibre: "E se nos dois primeiros meses vocês fecharem dois clientes, como seria a nota?" Inflexibilidade aqui é o melhor previsor de cliente-problema — e vale não aprovar.</span>` },
      { i: "5", mn: "Parabenizar", md: "Fecha o ciclo da inversão. A aprovação precisa ser explícita.",
        s: `Parabéns, vocês estão aprovados pra entrar com a gente.` },
      { i: "6", mn: "Condição e data", md: "Financeiro e agenda no mesmo movimento.",
        s: `Eu faço questão de conseguir a data o quanto antes. Agora, pra alinharmos o financeiro: <em>qual das condições ficou melhor pra você?</em>
        <br><br>E dando certo, se eu conseguir uma data pro nosso diagnóstico ainda esta semana — fica melhor de manhã ou à tarde? … Encaixa mais 8h30 ou 9h45?
        <span class="nota"><b>Sempre duas opções concretas.</b> "Quando fica bom pra você?" devolve a decisão e o processo para.</span>` },
      { i: "7", mn: "Fechar e cobrar", md: "Link ou pix gerado ao vivo, com a tela ainda compartilhada.",
        s: `Perfeito, então marcado. <em>Preparado pra transformação?</em>
        <br><br>Te enviei no WhatsApp — confirma se chegou? E se abre? Ótimo. Enquanto eu envio seus dados pro time fazer o onboarding, consegue já fazer agora ao vivo? Se der problema a gente resolve aqui.
        <span class="nota"><b>Se pedir pra pagar mais tarde:</b> "Sem problema, te mando à noite. Agora, é procedimento nosso pegar um sinal pra firmar e eu já mandar pro time fazer o onboarding. Consegue fazer um valor simbólico agora, qualquer valor, que a gente desconta do contrato?" O sinal não é sobre o dinheiro — é sobre a decisão sair da reunião fechada.</span>
        <span class="nota alerta"><b>Se não pagar no dia combinado,</b> mensagem no dia seguinte: "<em>Fulano</em>, só pra organizar aqui — vai dar certo de você fazer o pagamento hoje?" Curta, sem cobrança emocional, sem sumir.</span>` },
    ],
  },
];

export const FUNIS: Funil[] = [
  {
    tag: "Inbound", cor: "#86C0A6", nome: "Funil 2 · Novo seguidor",
    fluxo: "Novo seguidor → Direct 1 → Direct 2 → Direct 3 → Diagnóstico · três áudios, um por dia",
    msgs: [
      { n: "Áudio 1", t: "Abertura e conexão",
        s: `Olá <em>Fulano</em>, tudo bem? Às vezes eu dou uma olhada nas pessoas que estão chegando no meu perfil e acabei entrando no de vocês. Primeiro, parabéns — dá pra ver que fazem um trabalho muito bom na área de <em>(segmento)</em>. Vi também que estão conectados com gente com quem eu compartilho princípios, isso já me abre pra conversar.
        <br><br>Olha, eu não mando mensagem assim pra todo mundo não. Vi que a empresa já está estruturada, já gerando resultado. <em>Me conta: o que trouxe vocês pra cá? O que estão buscando mais hoje?</em>` },
      { n: "Áudio 2", t: "Gerar valor e perguntar o desafio",
        s: `Que bom que estamos alinhados. Independente de tudo que você já sabe, duas coisas que eu percebi — e vou falar direto, posso estar sendo invasivo, mas sinto que vocês são de avançar.
        <br><br><b class="hl">Primeiro:</b> olhando o posicionamento do perfil, dá pra dar alguns toques específicos que fazem muita diferença na autoridade de vocês.
        <br><br><b class="hl">Mas a principal coisa é outra:</b> muitas empresas boas como a de vocês, que já têm resultado, travam em construir faturamento maior com previsibilidade — porque o cliente ainda chega por indicação, e indicação você não controla.
        <br><br>Por exemplo: se o ticket é <em>R$ 8 mil</em> e com ajuste de posicionamento e processo vocês fecham quatro clientes a mais por mês, são <em>R$ 32 mil a mais no mês</em>. É um exemplo. <em>Faz sentido? Vocês vivem esse desafio hoje?</em> Independente de sim ou não: qual o maior desafio que vocês vivem hoje?` },
      { n: "Áudio 3", t: "Elogio com rapport e convite",
        s: `Que legal que estamos alinhados. Vamos fazer o seguinte: uma empresa como a de vocês eu considero já à frente, e algumas eu faço questão de conectar direto. A ideia é uma call de uns 30 minutos, entender o momento de vocês, eu já te passar um direcionamento — e se fizer sentido pros dois lados, vemos as possibilidades.
        <br><br><em>Se eu me organizasse amanhã às 9h ou às 17h, algum dos dois encaixaria?</em>
        <span class="nota"><b>Depois do sim:</b> "Marcado então. Se tiver imprevisto você me avisa com antecedência? A agenda tá bem cheia aqui." — e peça o WhatsApp. O gatilho do compromisso derruba no-show mais que qualquer lembrete.</span>
        <span class="nota"><b>Confirmação:</b> D-1 à noite se for reunião de manhã; no mesmo dia cedo se for à tarde.</span>` },
    ],
  },
  {
    tag: "Inbound", cor: "#86C0A6", nome: "Funil 3 · Anúncio, comentário ou direct",
    fluxo: "Anúncio ou comentário → Direct 1 → Direct 2 → Diagnóstico · mais quente, comprime em dois áudios",
    msgs: [
      { n: "Áudio 1", t: "Abertura, valor e desafio juntos",
        s: `Olá <em>Fulano</em>, tudo bem? Vi que você recebeu meu anúncio / comentou no post. Primeiro, parabéns — dá pra ver que fazem um trabalho muito bom na área de <em>(segmento)</em>.
        <br><br>Me fala: o que vocês estão buscando mais hoje? Eu percebo que é uma dor de muita empresa de <em>(segmento)</em> aumentar faturamento com previsibilidade pelo digital — o cliente até chega, mas chega por indicação, e aí um mês vem cheio e o outro vem vazio.
        <br><br>Por exemplo: se vocês têm um serviço de <em>R$ 20 mil</em> e fecham dois a mais por mês, são <em>R$ 40 mil a mais no mês</em>. <em>Faz sentido? Vocês vivem isso hoje?</em> Independente de sim ou não — qual o maior desafio de vocês?` },
      { n: "Áudio 2", t: "Convite com gatilho de alto valor",
        s: `Que legal que estamos alinhados. A ideia é uma call de uns 30 minutos pra entender o momento de vocês e eu já te passar um direcionamento. Se fizer sentido pros dois lados, vemos as possibilidades.
        <br><br><em>Se eu me organizasse amanhã às 9h ou às 17h, algum dos dois encaixaria?</em>
        <span class="nota"><b>Variação quando quem prospecta não fecha:</b> "Eu geralmente enviaria pro nosso estrategista comercial, mas decidi falar direto com você."</span>` },
    ],
  },
  {
    tag: "Tráfego", cor: "#CE7F4C", nome: "Funil 3-B · Lead frio via formulário",
    fluxo: "Lead de anúncio → Direct 1 → Formulário → Triagem → Diagnóstico",
    msgs: [
      { n: "Mensagem 1", t: "Abertura curta",
        s: `Olá <em>Fulano</em>, tudo bem? Vi que você recebeu meu anúncio. Primeiro, parabéns pelo trabalho de vocês na área de <em>(segmento)</em>. Me fala o que vocês estão buscando mais hoje e qual o maior desafio? Que já trocamos aqui.` },
      { n: "Mensagem 2", t: "Reciprocidade e envio do formulário",
        s: `Parabéns pela jornada. Percebo que muita empresa boa como a de vocês trava no posicionamento e na previsibilidade de vendas. Vamos fazer assim: vou te mandar um formulário aqui embaixo pra analisarmos o momento de vocês — e fazendo sentido, te convido pra uma consultoria estratégica de diagnóstico. Preenche com atenção que isso deixa a consultoria muito mais eficiente. Me avisa quando terminar.
        <span class="nota"><b>Perguntas mínimas do formulário:</b> faturamento mensal · nº de funcionários · segmento · como o cliente chega hoje · já investiu em marketing · quanto pode investir por mês. Sem faturamento e origem do cliente não há triagem possível.</span>` },
    ],
  },
  {
    tag: "Outbound", cor: "#CE7F4C", nome: "Funil 4 · Prospecção fria — Lara + vendedor",
    fluxo: "Lara monta a lista do ICP → Convite 1 → Convite 2 → Convite 3 → Diagnóstico · 10 convites por reunião",
    msgs: [
      { n: "Áudio 1", t: "Elogio específico e abertura",
        s: `Olá <em>Fulano</em>, tudo bem? Luiz aqui, do Grupo Expand. Eu estava olhando empresas de <em>(segmento)</em> aqui em <em>(cidade)</em> e cruzei com a de vocês. Parabéns — dá pra ver pelo perfil que entregam com qualidade, <em>(cite algo específico e verdadeiro)</em>.
        <br><br>Não mando mensagem assim pra todo mundo não. Me fala pra eu me localizar: <em>hoje o cliente de vocês chega mais por indicação ou já tem um processo rodando pelo digital?</em>
        <span class="nota alerta"><b>O elogio precisa ser verdadeiro e específico.</b> A Lara já entrega o gancho no enriquecimento da lista — use-o. Elogio genérico no frio queima o contato na primeira linha.</span>` },
      { n: "Áudio 2", t: "Gerar valor e perguntar o desafio",
        s: `Olha, o que eu mais vejo em empresa de <em>(segmento)</em> do porte de vocês é isso: o negócio funciona, entrega bem, tem cliente satisfeito — mas o cliente novo só aparece quando alguém indica. Aí tem mês que o telefone toca sozinho e mês que é silêncio, e não dá pra explicar o porquê.
        <br><br>A gente trabalha exatamente isso: posicionamento, conteúdo e processo de vendas, implementados pela nossa equipe junto com a empresa — não é curso nem mentoria. Se o ticket é <em>(valor)</em> e vocês fecham dois clientes a mais por mês, são <em>(valor × 2)</em> a mais, todo mês.
        <br><br><em>Faz sentido? Vocês vivem isso hoje?</em> E independente de sim ou não: qual o maior desafio de vocês?` },
      { n: "Áudio 3", t: "Convite com dois horários",
        s: `Legal que estamos alinhados. A ideia é uma call de uns 30 minutos pra eu entender melhor o momento de vocês e já te passar um direcionamento — mesmo que não trabalhemos juntos, você sai com um diagnóstico do que está travando.
        <br><br><em>Se eu conseguir um horário amanhã às 9h ou às 17h, algum dos dois encaixa?</em>
        <span class="nota"><b>Sem resposta?</b> Um único resgate 3 dias depois: "<em>Fulano</em>, imagino que tenha passado batido — só pra eu organizar minha lista, faz sentido conversarmos ou prefere que eu procure mais pra frente?" Depois disso vai para reativação em 60 dias. Não insista uma quarta vez.</span>` },
    ],
  },
  {
    tag: "Indicação", cor: "#E6D0A8", nome: "Funil 5 · Indicação estruturada",
    fluxo: "Cliente satisfeito → Pedido no ritual mensal → Apresentação → Diagnóstico · a melhor conversão da casa",
    msgs: [
      { n: "Momento 1", t: "O pedido, feito por quem entrega",
        s: `Antes de encerrar, <em>Fulano</em>, uma pergunta que eu faço pra todo cliente que está indo bem: <em>tem alguém do seu círculo — cliente, fornecedor, parceiro — que vive hoje o mesmo problema que você vivia antes de começar com a gente?</em> Empresa boa, que entrega bem, mas que só vende quando alguém indica.
        <span class="nota alerta"><b>Quem pede é o CS, não o comercial.</b> O pedido vindo de quem entrega é consequência de resultado, não investida de vendas. Feito na reunião mensal, depois do relatório — nunca por mensagem solta.</span>
        <span class="nota"><b>Só peça a clientes com entrega em dia</b> e ao menos um resultado apresentado. Pedir indicação a cliente insatisfeito custa a conta inteira.</span>` },
      { n: "Momento 2", t: "A ponte que não deixa esfriar",
        s: `Perfeito. Você consegue fazer uma apresentação nossa? Pode ser um grupo no WhatsApp com você, eu e ele, ou só o contato dele que eu falo mencionando seu nome. <em>Qual dos dois é mais confortável?</em>
        <span class="nota"><b>Grupo converte muito mais que contato solto</b> — a presença do indicador transfere confiança. Peça o grupo primeiro.</span>` },
      { n: "Momento 3", t: "A primeira mensagem ao indicado",
        s: `Olá <em>Fulano</em>, tudo bem? Luiz aqui, do Grupo Expand. O <em>(nome do cliente)</em> me falou de vocês — e falou muito bem. A gente trabalha com ele há <em>(tempo)</em> estruturando posicionamento, conteúdo e vendas no digital.
        <br><br>Ele comentou que talvez fizesse sentido a gente trocar uma ideia. Me fala pra eu me localizar: <em>hoje o cliente de vocês chega mais por indicação ou já tem processo rodando?</em>
        <span class="nota"><b>Defina a contrapartida antes:</b> comissão, desconto na mensalidade ou entrega extra ao indicador — e comunique no momento do pedido.</span>` },
    ],
  },
];

export const OBJ: Objecao[] = [
  { q: '"Não posso fazer agora."', t: "A mais comum — e quase nunca é a real. Por isso não se contorna antes de isolar.",
    s: `<b class="hl">1 · Solte a pressão.</b> Ok <em>Fulano</em>, podemos falar mais pra frente. Mas só pra eu entender: <em>o que te impede de tomar uma decisão agora?</em>
    <span class="resp">R: Não tenho o dinheiro agora.</span>
    <b class="hl">2 · Isole.</b> Só pra eu entender — o que te impede é apenas o financeiro? É isso?
    <span class="resp">R: Sim.</span>
    <b class="hl">3 · CSC: concorde, solte, contorne.</b> Eu te entendo. Tudo bem, podemos falar mais pra frente... Agora, várias empresas que estavam exatamente na sua situação perceberam uma coisa: se continuassem fazendo do mesmo jeito, o resultado não ia mudar. Deram um jeito de se organizar — e com o próprio impacto da implementação acabaram tendo mais resultado e mais caixa.`,
    z: `<b>Sem isolar, você contorna a objeção errada.</b> "Não tenho dinheiro" é frequentemente "não me convenci" com roupa de educação. A pergunta de isolamento revela qual das duas está na mesa.` },
  { q: "Os 3 sins — depois de isolar", t: "A ponte entre a objeção contornada e a nova proposta. Nunca refaça a oferta sem passar aqui.",
    s: `<b class="hl">Sim 1.</b> Você concorda que se a empresa trabalhar posicionamento, conteúdo e um processo de vendas de verdade, isso impacta diretamente no faturamento, certo?
    <span class="resp">R: Sim.</span>
    <b class="hl">Sim 2.</b> E entre seguir sozinho com os desafios <em>X, Y e Z</em>, ou ter a nossa equipe implementando junto — você economiza tempo, erro e dinheiro. Faz sentido?
    <span class="resp">R: Sim.</span>
    <b class="hl">Sim 3 · PAV.</b> Se eu fizesse de uma forma que coubesse no seu caixa, você estaria disposto a investir na empresa pra transformar esse resultado?
    <span class="resp">R: Sim.</span>`,
    z: `<b>Só depois dos três sins</b> se pergunta quanto ele consegue. Perguntar valor antes é negociar sem ter reconstruído o desejo.` },
  { q: "Descobrindo a capacidade real de pagamento", t: "Sondagem financeira. Com leveza, nunca como interrogatório.",
    s: `Quanto você acredita que consegue disponibilizar por mês pra investir na empresa?
    <span class="resp">R: Uns R$ 1.500.</span>
    <br>E consegue algum limite no cartão pra entrada, mesmo parcelada? Aí vemos o restante.
    <span class="resp">R: Preciso ver.</span>
    <br>Consegue ver agora? Só pra eu já deixar uma proposta clara, mesmo que a gente fale depois.
    <br><br>E existe algum valor no pix que você conseguiria de entrada?`,
    z: `<b>"Consegue ver agora?"</b> separa uma proposta concreta de um "depois eu vejo" que nunca volta. Peça com naturalidade — é procedimento, não pressão.` },
  { q: "Montando a condição sob medida", t: "Com os números na mão, a proposta se constrói ao vivo. Exceção comunicada como exceção.",
    s: `Vamos fazer assim: se eu abrir uma exceção e você parcelar a entrada de <em>R$ 7.000</em> em até 10x sem juros, mais <em>R$ 1.700</em> no pix — e em 30 dias, quando virar a fatura, você passa o restante. <em>Se eu abrir essa exceção, te ajudaria?</em>
    <span class="resp">R: Ajudaria.</span>
    <br><br>Ótimo. E dando certo, você consegue me mandar os acessos até que dia? … Se eu conseguir uma data pro diagnóstico na sexta, fica melhor de manhã ou à tarde? … Encaixa mais 8h30 ou 9h45?
    <br><br>Então já fica marcado. <em>Preparado pra transformação?</em>`,
    z: `<b>Sempre pré-agende antes de fechar.</b> A data torna a decisão tangível — ele se vê dentro do processo antes de assinar. Fechar sem data marcada é fechar com um pé fora.` },
  { q: '"Vou falar com meu sócio / minha esposa."', t: "Pode ser real ou fuga. A pergunta de nota revela qual.",
    s: `<b class="hl">1 · Meça o interesse real.</b> Pra eu me localizar: se dependesse só de você, de 1 a 5, qual o real interesse de fazer? Sendo 1 não fazer e 5 fazer.
    <br><br><b class="hl">Se for 4 ou 5,</b> a objeção é real e a decisão é compartilhada. Agende a conversa com os dois.
    <br><br><b class="hl">Se for 3 ou menos,</b> é não disfarçado. Aperte a dor: <em>Imagina daqui a seis meses, um ano, se nada mudar — concorda que a empresa vai estar no mesmo lugar?</em> E depois: <em>O que falta pra ser nota 5?</em>
    <br><br><b class="hl">2 · Técnica do "você me disse".</b> Você me disse que está cansado de não ter previsibilidade, certo? E que o cliente só chega quando alguém indica, certo? Eu entendo que muitas decisões são conversadas. Mas quem está dentro da operação todo dia, vendo esse gargalo, é você. Seu sócio tem clareza do tamanho disso?
    <span class="resp">R: É verdade, ele não tem tanta clareza dos detalhes.</span>
    <br><b class="hl">3 · Pergunta final.</b> Você realmente precisa falar com ele antes, ou dá pra decidir e depois alinhar?`,
    z: `<b>Se for legítima, marque você a volta.</b> "Você consegue ver até quando? … Te ligo amanhã à noite — fica melhor 17h ou 19h?" <b>Nunca deixe a bola com o cliente.</b>` },
  { q: '"Vou pensar."', t: "Não é objeção — é ausência de decisão. Trate como falta de informação ou de urgência.",
    s: `Claro, faz sentido pensar. Só pra eu te ajudar a pensar com propriedade: <em>o que exatamente você quer avaliar? É o investimento, o formato, ou o momento?</em>
    <br><br><b class="hl">Investimento</b> → vá para o isolamento da objeção financeira.
    <br><b class="hl">Formato</b> → é dúvida de entrega. Detalhe o Dia de Gravação e o que a equipe faz.
    <br><b class="hl">Momento</b> → Teorema de Jaque, abaixo.
    <span class="nota"><b>Ajuda concreta para decisão de cartão:</b> "Se você passar hoje, quando cai sua fatura?" — <em>R: daqui a 35 dias.</em> — "Então a primeira parcela cai daqui a 35 dias. Imagina o que a empresa pode gerar nesse tempo, inclusive muito mais que essa parcela."</span>`,
    z: `<b>A decisão imediata do F1 existe pra evitar essa objeção.</b> Se "vou pensar" aparece com frequência, o problema não é o F2 — é que a Etapa 03 está sendo pulada ou feita sem convicção.` },
  { q: '"Já tentei agência ou curso e não funcionou."', t: "Específica do mercado da Expand — e a mais fácil de virar a favor.",
    s: `Eu entendo, e olha, isso é até bom sinal: significa que você já reconheceu o problema e já se mexeu. Agora deixa eu perguntar: <em>nesse trabalho anterior, quem executava?</em>
    <span class="resp">R: Eles mandavam o que fazer e eu tinha que gravar.</span>
    <br>Pois é, esse é exatamente o ponto. A maioria ensina o que fazer — e aí sobra pra você, que já não tem tempo. A gente não é curso nem mentoria: <em>a nossa equipe roteiriza, dirige e edita</em>. Você participa gravando, com roteiro na mão, hora marcada e alguém te dirigindo ao vivo. É por isso que o modelo se chama Dia de Gravação, e é por isso que ele destrava quem já tentou e travou.`,
    z: `<b>Esta objeção é a porta de entrada do diferencial da marca.</b> Quando ela aparece, não se defenda — agradeça. É a deixa perfeita para o "implementamos com você".` },
  { q: 'F3 · "Vamos fazer daqui a dois meses."', t: "Teorema de Jaque. Só entre aqui depois de o F2 ter esgotado.",
    s: `<b class="hl">1 · Você me disse.</b> Legal, podemos falar daqui a dois meses. Agora — você me disse que está cansado de não ter previsibilidade e de o cliente só chegar por indicação, certo?
    <span class="resp">R: Sim.</span>
    <b class="hl">2 · Teorema de Jaque.</b> E já que você vai fazer daqui a dois meses de qualquer forma, você concorda que <em>quanto antes começar, melhor</em>? Certo?
    <span class="resp">R: Certo.</span>
    <b class="hl">3 · A exceção.</b> Então eu não quero que o financeiro seja o impedimento. Se eu abrir uma exceção — e olha, não costumo fazer isso, só quando faz sentido de verdade — existe um formato menor, o <em>PIDE Semestral</em>, que eu não anuncio em lugar nenhum. Funciona como degrau: a empresa entra, estrutura o essencial, e sobe pro Anual quando o resultado já estiver pagando.`,
    z: `<b>O downsell é último recurso, não plano B confortável.</b> Descer o degrau com quem podia pagar o Anual custa margem e ensina o mercado a esperar desconto. Só desça depois de isolar e provar que não pode.` },
];

// Agenda da semana comercial
export const CB = { pros: "#CE7F4C", reu: "#C89B5E", fup: "#6FBF92", rit: "#8A9990" };
export const AG_COLS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
type Cell = { t: string; s: string; c: string };
const bx = (t: string, s: string, c: string): Cell => ({ t, s, c });
export const AG_GRID: { h: string; b: Cell[] }[] = [
  { h: "08h30", b: [bx("Pipeline semanal", "Pedro + Luiz · 30 min", CB.rit), bx("Preparo do dia", "15 min", CB.rit), bx("Preparo do dia", "15 min", CB.rit), bx("Preparo do dia", "15 min", CB.rit), bx("Preparo do dia", "15 min", CB.rit)] },
  { h: "09h00", b: [bx("Prospecção", "Outbound frio · Lara", CB.pros), bx("Prospecção", "Outbound frio · Lara", CB.pros), bx("Prospecção", "Outbound frio · Lara", CB.pros), bx("Prospecção", "Outbound frio · Lara", CB.pros), bx("Prospecção", "Outbound frio · Lara", CB.pros)] },
  { h: "10h00", b: [bx("Prospecção", "Novos seguidores", CB.pros), bx("Prospecção", "Stories e comentários", CB.pros), bx("Prospecção", "Leads de tráfego", CB.pros), bx("Prospecção", "Novos seguidores", CB.pros), bx("Prospecção", "Resgates sem resposta", CB.pros)] },
  { h: "11h00", b: [bx("Diagnóstico 1", "Método 3F", CB.reu), bx("Diagnóstico 1", "Método 3F", CB.reu), bx("Diagnóstico 1", "Método 3F", CB.reu), bx("Diagnóstico 1", "Método 3F", CB.reu), bx("Diagnóstico 1", "Método 3F", CB.reu)] },
  { h: "13h30", b: [bx("Follow-up", "Régua D+1 e D+3", CB.fup), bx("Follow-up", "Régua D+1 e D+3", CB.fup), bx("Indicação", "Pedidos à carteira", CB.fup), bx("Follow-up", "Régua D+7 e D+14", CB.fup), bx("Follow-up", "Pendências", CB.fup)] },
  { h: "14h30", b: [bx("Diagnóstico 2", "Método 3F", CB.reu), bx("Diagnóstico 2", "Método 3F", CB.reu), bx("Diagnóstico 2", "Método 3F", CB.reu), bx("Diagnóstico 2", "Método 3F", CB.reu), bx("Diagnóstico 2", "Método 3F", CB.reu)] },
  { h: "15h30", b: [bx("Buffer", "Remarcação ou 3ª reunião", CB.reu), bx("Buffer", "Remarcação ou 3ª reunião", CB.reu), bx("Comercial ↔ Entrega", "Handoff das contas", CB.rit), bx("Buffer", "Remarcação ou 3ª reunião", CB.reu), bx("Reativação", "Leads de 60 e 90 dias", CB.fup)] },
  { h: "16h30", b: [bx("CRM e lista", "Registrar e montar amanhã", CB.rit), bx("CRM e lista", "Registrar e montar amanhã", CB.rit), bx("CRM e lista", "Registrar e montar amanhã", CB.rit), bx("CRM e lista", "Registrar e montar amanhã", CB.rit), bx("Fechamento da semana", "Números com o Pedro", CB.rit)] },
];
export const AG_LEG: [string, string][] = [["Prospecção", CB.pros], ["Reunião de diagnóstico", CB.reu], ["Follow-up e reativação", CB.fup], ["Ritual e gestão", CB.rit]];

// A Lara na prospecção
export const LARA = {
  nome: "Lara", cor: "#E0BC85",
  papel: "Inteligência & Prospecção · IA",
  resumo: "A Lara abastece o topo do funil: monta a lista do ICP, enriquece cada contato e entrega o gancho pronto pro vendedor abrir a conversa.",
  entregas: [
    { t: "Lista do ICP", d: "Empresas do segmento e da praça certos, via Apify (Google Maps, redes)." },
    { t: "Enriquecimento", d: "WhatsApp, perfil e um gancho verdadeiro e específico pra abertura do Funil 4." },
    { t: "Dedupe e triagem", d: "Remove quem já está na base e prioriza quem tem fit de ticket." },
    { t: "Hand-off", d: "Entrega a lista pronta pro vendedor rodar os funis de Outbound e Indicação." },
  ],
  aprova: "Vendedor conduz a conversa e fecha — a Lara não fala com o lead.",
};
