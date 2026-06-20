import type { Metadata } from "next";
import { Inter, Lora, JetBrains_Mono } from "next/font/google";
import { ProvedoresApp } from "@/components/provedores/provedores-app";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const fonteSans = Inter({
  variable: "--fonte-sans",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const fonteSerif = Lora({
  variable: "--fonte-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const fonteMono = JetBrains_Mono({
  variable: "--fonte-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simulados SEDU",
  description:
    "Plataforma de simulados educacionais com IA da Secretaria Estadual de Educação",
  applicationName: "Simulados SEDU",
  authors: [{ name: "Secretaria Estadual de Educação" }],
};

export default function LayoutRaiz({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${fonteSans.variable} ${fonteSerif.variable} ${fonteMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ProvedoresApp>{children}</ProvedoresApp>
        <SpeedInsights />
      </body>
    </html>
  );
}
