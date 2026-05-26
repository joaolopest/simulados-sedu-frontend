"use client";

import { type CSSProperties, type RefObject } from "react";
import {
  BarChart3,
  Heart,
  School,
  Sparkles,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useContadorAnimado } from "@/hooks/use-contador-animado";

function NumeroAnimado({
  valorFinal,
  formatador,
  className,
  style,
}: {
  valorFinal: number;
  formatador?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, valor } = useContadorAnimado({ valorFinal, formatador });
  return (
    <span
      ref={ref as RefObject<HTMLSpanElement>}
      className={className}
      style={style}
    >
      {valor}
    </span>
  );
}

interface CardBento {
  icone: LucideIcon;
  rotulo: string;
  numero: string;
  valorFinal?: number;
  formatador?: (n: number) => string;
  unidade: string;
  bg: string;
  texto: string;
  acento: string;
  span?: string;
  extra?: string;
}

const STATS: CardBento[] = [
  {
    icone: School,
    rotulo: "Escolas estaduais",
    numero: "47",
    valorFinal: 47,
    formatador: (n) => Math.round(n).toString(),
    unidade: "ativas em 78 municípios",
    bg: "bg-chartreuse",
    texto: "text-shade",
    acento: "text-forest",
    span: "md:col-span-2",
    extra: "+12 entram até dezembro",
  },
  {
    icone: Users,
    rotulo: "Alunos cadastrados",
    numero: "12.420",
    valorFinal: 12420,
    unidade: "ativos",
    bg: "bg-orchid",
    texto: "text-marble",
    acento: "text-chartreuse",
  },
  {
    icone: Sparkles,
    rotulo: "Confiança média da IA",
    numero: "92",
    valorFinal: 92,
    formatador: (n) => Math.round(n).toString(),
    unidade: "%",
    bg: "bg-iris",
    texto: "text-marble",
    acento: "text-sky",
  },
  {
    icone: BarChart3,
    rotulo: "Simulados aplicados",
    numero: "318",
    valorFinal: 318,
    formatador: (n) => Math.round(n).toString(),
    unidade: "no ano",
    bg: "bg-rose",
    texto: "text-marble",
    acento: "text-poppy",
  },
  {
    icone: Heart,
    rotulo: "Adaptações ativas",
    numero: "1.840",
    valorFinal: 1840,
    unidade: "alunos com TDAH/dislexia/discalculia",
    bg: "bg-lavender",
    texto: "text-shade",
    acento: "text-orchid",
    span: "md:col-span-2",
  },
  {
    icone: Zap,
    rotulo: "Tempo médio do diagnóstico",
    numero: "4h",
    unidade: "do último envio à entrega",
    bg: "bg-poppy",
    texto: "text-shade",
    acento: "text-currant",
  },
  {
    icone: Trophy,
    rotulo: "Coordenadores ativos",
    numero: "82",
    valorFinal: 82,
    formatador: (n) => Math.round(n).toString(),
    unidade: "trabalhando agora",
    bg: "bg-canopy",
    texto: "text-shade",
    acento: "text-forest",
  },
];

export function ManifestoBlock() {
  return (
    <section
      className="bg-marble py-20 md:py-28"
      data-slot="bento-stats"
      aria-labelledby="bento-titulo"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <header className="mb-10 max-w-3xl md:mb-14">
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-rose"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 0ms backwards",
            }}
          >
            A rede em números
          </p>
          <h2
            id="bento-titulo"
            className="mt-4 font-sans text-shade font-display-bold"
            style={{               fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              lineHeight: "1.07",
              letterSpacing: "-0.018em",
              animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
            }}
          >
            Atualiza{" "}
            <span className="text-orchid italic">todo dia</span>, ao vivo.
          </h2>
        </header>

        {/* bento — cards de tamanhos variados (estilo Linktree dashboard) */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">
          {STATS.map((s, i) => (
            <article
              key={s.rotulo}
              className={`group relative overflow-hidden rounded-[28px] p-7 transition-transform duration-300 hover:-translate-y-1 md:p-8 ${s.bg} ${s.texto} ${s.span ?? ""}`}
              style={{
                minHeight: i === 0 || i === 4 ? "200px" : "220px",
                animation: `slide-in-card 0.7s var(--ease-quint) ${i * 120}ms backwards`,
              }}
            >
              <div className="flex items-start justify-between">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">
                  {s.rotulo}
                </p>
                <span
                  className={`shrink-0 transition-transform duration-300 group-hover:rotate-12 ${s.acento}`}
                  aria-hidden
                >
                  <s.icone className="size-6" />
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <div
                  className="font-sans tabular-nums"
                  style={{
                    fontSize:
                      s.span === "md:col-span-2" ? "5rem" : "3.75rem",
                    lineHeight: "1",
                    
                    letterSpacing: "-0.04em",
                  }}
                >
                  {s.valorFinal !== undefined ? (
                    <NumeroAnimado
                      valorFinal={s.valorFinal}
                      formatador={s.formatador}
                    />
                  ) : (
                    s.numero
                  )}
                </div>
                {s.unidade.length <= 3 && (
                  <p
                    className="font-sans"
                    style={{
                      fontSize: "1.5rem",
                      
                      opacity: 0.7,
                    }}
                  >
                    {s.unidade}
                  </p>
                )}
              </div>

              {s.unidade.length > 3 && (
                <p className="mt-2 text-sm font-medium opacity-80">
                  {s.unidade}
                </p>
              )}

              {s.extra && (
                <p className="mt-4 inline-flex items-center rounded-full bg-shade/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">
                  {s.extra}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
