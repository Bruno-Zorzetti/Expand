import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expand — Plataforma",
  description: "Operação inteligente. Equipe humana + IA executando para os seus clientes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Aplica tema (claro/escuro) e cor de acento salvos ANTES da página pintar (sem flash).
const themeInit = `(function(){try{
  var t=localStorage.getItem('hx-theme'); if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}
  var a=localStorage.getItem('hx-accent'); if(a){document.documentElement.style.setProperty('--accent',a);}
  var a2=localStorage.getItem('hx-accent2'); if(a2){document.documentElement.style.setProperty('--accent-2',a2);}
}catch(e){}})();`;

// Botões de formulário: feedback visual de loading automático ao submeter
const btnLoadingInit = `(function(){
  document.addEventListener('submit', function(e){
    var form = e.target;
    var btn  = form.querySelector('button[type="submit"]:not([data-no-loading])');
    if(!btn || btn.getAttribute('aria-busy')==='true') return;
    btn.setAttribute('aria-busy','true');
    btn.setAttribute('disabled','');
    // Remove após 8s para não travar a UI se o redirect demorar
    setTimeout(function(){ btn.removeAttribute('aria-busy'); btn.removeAttribute('disabled'); }, 8000);
  }, true);
})();`;

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
        <script dangerouslySetInnerHTML={{ __html: btnLoadingInit }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
