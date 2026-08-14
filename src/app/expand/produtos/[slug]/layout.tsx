import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProdutoTabs from "@/components/expand/ProdutoTabs";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function ProdutoHubLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: prod } = await supabase
    .from("products")
    .select("name, category, active, tagline")
    .eq("slug", slug)
    .single();
  if (!prod) notFound();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Link href="/expand/produtos" className="ex-back" style={{ marginBottom: 0 }}>← Produtos</Link>
        <span style={{ fontSize: 11, color: "var(--line-2)" }}>/</span>
        <span style={{ fontSize: 11, color: "var(--dim)", fontFamily: "monospace" }}>{slug}</span>
        {!prod.active && (
          <span className="ex-pill" style={{ color: "var(--dim)", marginLeft: 4 }}>rascunho</span>
        )}
      </div>
      <p className="hx-eyebrow">{prod.category ?? "Produto"}</p>
      <h1 className="ex-h1" style={{ marginBottom: prod.tagline ? 4 : 16 }}>{prod.name}</h1>
      {prod.tagline && (
        <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 16 }}>{prod.tagline}</p>
      )}
      <ProdutoTabs slug={slug} />
      {children}
    </>
  );
}
