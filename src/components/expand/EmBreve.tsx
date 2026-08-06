export default function EmBreve({ titulo, nota }: { titulo: string; nota: string }) {
  return (
    <>
      <p className="hx-eyebrow">Em portação</p>
      <h1 className="ex-h1">{titulo}</h1>
      <p className="ex-sub">{nota}</p>
      <div className="ex-panel hx-glass" style={{ maxWidth: 640 }}>
        <div className="ph"><span className="pt">Próxima no roteiro</span></div>
        <div className="pb">
          <div className="ex-mini"><span className="ml">Esta tela já existe no protótipo (HTML) e está sendo portada para React lendo do Supabase, no mesmo padrão de painéis.</span></div>
        </div>
      </div>
    </>
  );
}
