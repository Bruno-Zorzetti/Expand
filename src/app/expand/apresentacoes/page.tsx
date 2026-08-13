import SlideBuilder from "@/components/expand/SlideBuilder";

export const dynamic = "force-dynamic";

export default function ApresentacoesPage() {
  return (
    <>
      <div className="ex-hero">
        <div className="eb">Ferramentas · IA</div>
        <h2>Construtor de Apresentações</h2>
        <p>Cole o conteúdo ou carregue um arquivo de texto — a IA transforma tudo em uma apresentação linda, pronta para apresentar ou baixar como HTML.</p>
      </div>
      <SlideBuilder />
    </>
  );
}
