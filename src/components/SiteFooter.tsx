import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm">
        <p className="text-[var(--dim)]">
          © {new Date().getFullYear()} HASHES — Marketing e Tecnologia
        </p>
        <nav className="flex flex-wrap items-center gap-4 text-[var(--mut)]">
          <Link href="/" className="hover:text-[var(--txt)]">Catálogo</Link>
          <Link href="/dashboard" className="hover:text-[var(--txt)]">Meu painel</Link>
          <Link href="/contato" className="hover:text-[var(--txt)]">Contato</Link>
          <Link href="/termos" className="hover:text-[var(--txt)]">Termos & metodologia</Link>
          <a href="https://wa.me/5565996779777" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--txt)]">
            Falar no WhatsApp
          </a>
        </nav>
      </div>
    </footer>
  );
}
