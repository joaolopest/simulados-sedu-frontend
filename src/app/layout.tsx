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
  metadataBase: new URL("https://simulados-sedu.vercel.app"),
  title: "Simulados SEDU",
  description:
    "Plataforma de simulados educacionais desenvolvida na Residência de Software II da UNIT, em parceria com a SEDUC Sergipe",
  applicationName: "Simulados SEDU",
  authors: [{ name: "Residência de Software II · Universidade Tiradentes" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    title: "Simulados SEDU — Avaliação educacional",
    description:
      "Plataforma full stack para criar, aplicar e analisar simulados educacionais, desenvolvida na Residência de Software II da UNIT.",
    images: [
      {
        url: "/images/simulados-sedu-linkedin.png",
        width: 1734,
        height: 907,
        alt: "Simulados SEDU — plataforma de avaliação educacional com Next.js e FastAPI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Simulados SEDU — Avaliação educacional",
    description:
      "Plataforma full stack para criar, aplicar e analisar simulados educacionais.",
    images: ["/images/simulados-sedu-linkedin.png"],
  },
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
