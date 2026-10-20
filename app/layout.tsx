import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skill RoadMap — GPS de carreira",
  description: "Descubra os caminhos de carreira mais rentáveis para o seu perfil e siga um roadmap completo.",
};

// Roda antes da página aparecer: o padrão é escuro; só fica claro se o usuário escolheu antes.
const THEME_SCRIPT = `(function(){try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.remove("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="relative min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
