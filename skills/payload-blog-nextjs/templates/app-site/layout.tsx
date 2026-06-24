import type { Metadata } from "next";
import "../globals.css";

// Este é o root layout do site público. Mantém <html> e <body>.
// Adicione aqui Navbar, Footer, fontes globais, etc.
// Importante: NÃO deve existir app/layout.tsx — cada route group ((site) e (payload))
// fornece seu próprio root layout, padrão "multiple root layouts" do Next.js.

export const metadata: Metadata = {
  title: "{{SITE_TITLE}}",
  description: "{{SITE_DESCRIPTION}}",
};

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="{{LOCALE}}" className="h-full">
      <body className="min-h-full flex flex-col">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
