"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Visão Geral", suffix: "" },
  { label: "Processo", suffix: "/processo" },
  { label: "Cronograma", suffix: "/cronograma" },
  { label: "Entregáveis", suffix: "/entregaveis" },
  { label: "SLA", suffix: "/sla" },
];

export default function ProdutoTabs({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/expand/produtos/${slug}`;
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 22, borderBottom: "1px solid var(--line)", marginLeft: -2, overflowX: "auto" }}>
      {TABS.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const isActive = tab.suffix === "" ? path === href : path.startsWith(href);
        return (
          <Link
            key={tab.suffix}
            href={href}
            style={{
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? "var(--accent)" : "var(--mut)",
              borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
              textDecoration: "none",
              transition: ".15s",
              display: "block",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
