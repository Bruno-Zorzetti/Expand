import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expand — Plataforma",
  description: "Operação inteligente. Equipe humana + IA executando para os seus clientes.",
};

// Aplica tema (claro/escuro) e cor de acento salvos ANTES da página pintar (sem flash).
const themeInit = `(function(){try{
  var t=localStorage.getItem('hx-theme'); if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}
  var a=localStorage.getItem('hx-accent'); if(a){document.documentElement.style.setProperty('--accent',a);}
  var a2=localStorage.getItem('hx-accent2'); if(a2){document.documentElement.style.setProperty('--accent-2',a2);}
}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
