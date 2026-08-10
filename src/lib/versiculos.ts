// Versículo do dia (bíblia católica) — escolhido de forma determinística pelo dia do ano,
// então todo mundo vê o mesmo versículo no mesmo dia, sem sorteio a cada render.
export type Versiculo = { t: string; r: string };

export const VERSICULOS: Versiculo[] = [
  { t: "Tudo posso naquele que me fortalece.", r: "Filipenses 4,13" },
  { t: "O Senhor é meu pastor, nada me faltará.", r: "Salmo 23,1" },
  { t: "Entrega ao Senhor os teus caminhos, confia nele, e ele agirá.", r: "Salmo 37,5" },
  { t: "Tudo tem o seu tempo determinado, e há tempo para todo propósito debaixo do céu.", r: "Eclesiastes 3,1" },
  { t: "Sede firmes, inabaláveis, progredindo sempre na obra do Senhor.", r: "1Coríntios 15,58" },
  { t: "O que fizerdes, fazei de bom coração, como para o Senhor.", r: "Colossenses 3,23" },
  { t: "Não vos inquieteis com coisa alguma; em tudo, apresentai a Deus os vossos pedidos.", r: "Filipenses 4,6" },
  { t: "Buscai primeiro o Reino de Deus e a sua justiça, e tudo o mais vos será dado por acréscimo.", r: "Mateus 6,33" },
  { t: "A tua palavra é lâmpada para os meus pés e luz para o meu caminho.", r: "Salmo 119,105" },
  { t: "Confia no Senhor de todo o coração e não te apoies em tua própria inteligência.", r: "Provérbios 3,5" },
  { t: "Onde estiver o teu tesouro, aí estará também o teu coração.", r: "Mateus 6,21" },
  { t: "Sê forte e corajoso; o Senhor teu Deus estará contigo por onde andares.", r: "Josué 1,9" },
  { t: "O amor é paciente, o amor é prestativo; não é invejoso, não se ostenta.", r: "1Coríntios 13,4" },
  { t: "Vinde a mim todos vós que estais cansados sob o peso do vosso fardo, e eu vos aliviarei.", r: "Mateus 11,28" },
  { t: "Quem é fiel no pouco, também é fiel no muito.", r: "Lucas 16,10" },
  { t: "O Senhor guarda a tua entrada e a tua saída, desde agora e para sempre.", r: "Salmo 121,8" },
  { t: "A fé é o fundamento da esperança, é uma certeza a respeito do que não se vê.", r: "Hebreus 11,1" },
  { t: "Bem-aventurados os que promovem a paz, porque serão chamados filhos de Deus.", r: "Mateus 5,9" },
  { t: "Alegrai-vos sempre no Senhor. Repito: alegrai-vos!", r: "Filipenses 4,4" },
  { t: "O trabalho das tuas mãos, o Senhor o abençoará.", r: "Deuteronômio 28,12" },
  { t: "Servi uns aos outros, cada um com o dom que recebeu.", r: "1Pedro 4,10" },
  { t: "Melhor é serem dois do que um, porque têm melhor paga do seu trabalho.", r: "Eclesiastes 4,9" },
  { t: "A alegria do Senhor é a vossa força.", r: "Neemias 8,10" },
  { t: "Ele dá força ao cansado e multiplica o vigor do que não tem forças.", r: "Isaías 40,29" },
  { t: "Ide e fazei discípulos entre todos os povos.", r: "Mateus 28,19" },
  { t: "Deus é o nosso refúgio e a nossa força, socorro sempre presente na angústia.", r: "Salmo 46,2" },
  { t: "Que a vossa palavra seja sempre amável, temperada com sal.", r: "Colossenses 4,6" },
  { t: "Não durmas, para que não te faltes o pão; abre os olhos e te fartarás.", r: "Provérbios 20,13" },
  { t: "Cada um receberá o seu salário de acordo com o seu trabalho.", r: "1Coríntios 3,8" },
  { t: "Lançai as vossas preocupações sobre ele, porque ele cuida de vós.", r: "1Pedro 5,7" },
  { t: "A esperança não decepciona, porque o amor de Deus foi derramado em nossos corações.", r: "Romanos 5,5" },
];

export function versiculoDoDia(d = new Date()): Versiculo {
  const inicio = new Date(d.getFullYear(), 0, 0);
  const dia = Math.floor((d.getTime() - inicio.getTime()) / 86400000);
  return VERSICULOS[dia % VERSICULOS.length];
}
