import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Invertify · Tu asesor de inversiones",
  description:
    "Analizá tu cartera de Cocos, IOL, Balanz o PPI, contanos tu objetivo (un departamento, tu retiro) y recibí un plan claro con el paso a paso para tu broker.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0b14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted space-y-3">
            <p>
              <strong className="text-ink-2">Aviso importante:</strong> Invertify es una herramienta educativa. Las sugerencias se generan
              automáticamente a partir de reglas de diversificación y supuestos de mercado; no constituyen asesoramiento financiero
              personalizado ni una recomendación de compra o venta. Los rendimientos pasados no garantizan rendimientos futuros. Antes de
              invertir, consultá con un Asesor Global de Inversiones registrado en la CNV.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/analizar" className="hover:text-ink">Analizar cartera</Link>
              <Link href="/guias" className="hover:text-ink">Guías por broker</Link>
              <Link href="/aprender" className="hover:text-ink">Aprender</Link>
              <span>© {new Date().getFullYear()} Invertify</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
