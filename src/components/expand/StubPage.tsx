import Link from "next/link";

export function StubPage({
  titulo,
  secao,
  descricao,
  icone = "🚧",
}: {
  titulo: string;
  secao?: string;
  descricao?: string;
  icone?: string;
}) {
  return (
    <div>
      {secao && <p className="hx-eyebrow">{secao}</p>}
      <h1 className="ex-h1">
        {titulo}
      </h1>

      <div
        style={{
          marginTop: 32,
          padding: "48px 32px",
          background: "var(--panel-2)",
          border: "1px dashed var(--line)",
          borderRadius: 16,
          textAlign: "center",
          maxWidth: 520,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>{icone}</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--txt)",
            marginBottom: 8,
          }}
        >
          Em construção
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--dim)",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {descricao ??
            "Esta seção está sendo desenvolvida. Em breve estará disponível com funcionalidade completa."}
        </p>
        <Link
          href="/expand/v2"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--accent)",
            color: "#fff",
            borderRadius: 8,
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Voltar ao Hub do Dia
        </Link>
      </div>
    </div>
  );
}
