import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skill RoadMap — GPS de carreira",
  description: "Descubra os caminhos de carreira mais rentáveis para o seu perfil e siga um roadmap completo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
