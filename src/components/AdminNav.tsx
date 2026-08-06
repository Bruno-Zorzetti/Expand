"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/admin", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/servicos", label: "Serviços & Preços" },
  { href: "/admin/roadmap", label: "Roadmap" },
  { href: "/admin/plano", label: "Plano & Fluxo" },
  { href: "/admin/agentes", label: "Agentes" },
  { href: "/admin/whatsapp", label: "WhatsApp" },
  { href: "/admin/config", label: "Configurações" },
  { href: "/estilo", label: "Estilo" },
];
const EM_BREVE = ["Fila da equipe", "Custos & Finanças"];

export default function AdminNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 overflow-x-auto px-6">
        <Link href="/admin" className="shrink-0 font-extrabold tracking-wide">
          HASHES <span className="text-[var(--accent)]">Admin</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 whitespace-nowrap">
          {ITENS.map((it) => {
            const ativo = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  ativo ? "bg-[#2F80FF]/15 text-[#5AA0FF]" : "text-[#8B96AC] hover:text-[#EAF0FA]"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
          {EM_BREVE.map((label) => (
            <span
              key={label}
              title="Em breve"
              className="cursor-default rounded-lg px-3 py-1.5 text-sm text-[#3a465f]"
            >
              {label}
            </span>
          ))}
          <Link href="/dashboard" className="ml-3 text-sm text-[#8B96AC] hover:text-[#EAF0FA]">
            Sair do admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
