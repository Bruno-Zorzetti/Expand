import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function TermosPage() {
  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />
      <article className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-12 text-[var(--mut)]">
        <h1 className="text-3xl font-extrabold text-[var(--txt)]">Metodologia, Termos de Uso e Políticas</h1>
        <p className="text-sm text-[var(--dim)]">Última atualização: 02/08/2026</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--txt)]">1. Sobre o diagnóstico e o Health Score</h2>
          <p>
            O diagnóstico do Google Meu Negócio e o “Health Score” (0 a 100) são uma
            <b> metodologia proprietária da Hashes</b>, criada para ajudar o cliente a entender,
            de forma simples, o que pode ser melhorado no seu perfil. Ele combina dados públicos
            do perfil (coletados do Google Maps) com um conjunto de sinais ponderados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--txt)]">2. O que é oficial x o que é estimativa de mercado</h2>
          <p>
            O Google declara publicamente que o ranqueamento local é baseado em
            <b> três fatores: relevância, distância e proeminência</b>. Sinais como categoria,
            avaliações e dados de contato se conectam diretamente a esses fatores oficiais.
          </p>
          <p>
            Outros itens — e os <b>pesos percentuais</b> atribuídos a cada sinal — são
            <b> heurísticas baseadas em boas práticas de SEO local e na experiência de mercado da Hashes</b>.
            Onde não existe um dado público oficial do Google, adotamos uma regra própria, sempre
            sinalizada no diagnóstico como <span className="text-[#8B96AC]">“estimativa de mercado”</span>.
          </p>
          <p>
            As porcentagens de ganho (ex.: “+12 pts”) representam o impacto de cada item
            <b> dentro do nosso Health Score</b>, e não uma promessa de posição específica no Google.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--txt)]">3. Ausência de garantia de resultados</h2>
          <p>
            O ranqueamento no Google depende de fatores fora do controle da Hashes (algoritmo do
            Google, concorrência, comportamento dos usuários, localização de quem busca). Por isso,
            <b> não garantimos posição, “TOP 3” ou volume de clientes</b>. Nosso compromisso é aplicar
            as melhores práticas para maximizar as chances de melhora.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--txt)]">4. Dados e privacidade</h2>
          <p>
            Utilizamos apenas dados públicos do perfil e informações que você nos fornece no
            briefing. Os dados são usados para gerar o diagnóstico e executar o serviço contratado.
            Você pode solicitar a exclusão dos seus dados a qualquer momento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--txt)]">5. Comparação com concorrentes</h2>
          <p>
            Quando exibimos concorrentes próximos, usamos dados públicos do Google Maps
            (nome, avaliações, nota, distância aproximada) apenas para fins de comparação e
            contexto de mercado. Não há qualquer relação da Hashes com esses estabelecimentos.
          </p>
        </section>

        <p className="pt-4 text-sm text-[var(--dim)]">
          Ao usar a plataforma, você concorda com esta metodologia e com estes termos.
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
