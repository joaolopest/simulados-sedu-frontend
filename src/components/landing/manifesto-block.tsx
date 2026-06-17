"use client";

import { type CSSProperties, type RefObject } from "react";
import {
  BarChart3,
  Heart,
  School,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useContadorAnimado } from "@/hooks/use-contador-animado";
import { useLandingPublica } from "@/hooks/api/use-publico";

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
  valorFinal: number;
  unidade: string;
  bg: string;
  texto: string;
  acento: string;
  span?: string;
}

const formatarInteiro = (n: number) => Math.round(n).toLocaleString("pt-BR");

export function ManifestoBlock() {
  const { data } = useLandingPublica();
  const metricas = data?.metricas;
  const stats: CardBento[] = [
    {
      icone: School,
      rotulo: "Escolas estaduais",
      valorFinal: metricas?.totalEscolas ?? 0,
      unidade: `${formatarInteiro(metricas?.totalMunicipios ?? 0)} municipios`,
      bg: "bg-chartreuse",
      texto: "text-shade",
      acento: "text-forest",
      span: "md:col-span-2",
    },
    {
      icone: Users,
      rotulo: "Alunos cadastrados",
      valorFinal: metricas?.totalAlunos ?? 0,
      unidade: "ativos no banco",
      bg: "bg-orchid",
      texto: "text-marble",
      acento: "text-chartreuse",
    },
    {
      icone: BarChart3,
      rotulo: "Simulados criados",
      valorFinal: metricas?.totalSimulados ?? 0,
      unidade: "persistidos",
      bg: "bg-rose",
      texto: "text-marble",
      acento: "text-poppy",
    },
    {
      icone: Heart,
      rotulo: "Adaptacoes ativas",
      valorFinal: metricas?.totalAdaptacoes ?? 0,
      unidade: "alunos com suporte",
      bg: "bg-lavender",
      texto: "text-shade",
      acento: "text-orchid",
      span: "md:col-span-2",
    },
    {
      icone: Trophy,
      rotulo: "Gestores ativos",
      valorFinal: metricas?.totalGestores ?? 0,
      unidade: "com escola vinculada",
      bg: "bg-canopy",
      texto: "text-shade",
      acento: "text-forest",
    },
  ];

  return (
    <section
      className="bg-marble py-20 transition-colors dark:bg-shade md:py-28"
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
            className="mt-4 font-sans text-shade font-display-bold dark:text-marble"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              lineHeight: "1.07",
              letterSpacing: "0",
              animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
            }}
          >
            Atualiza <span className="text-orchid italic">pelo banco</span>.
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((s, i) => {
            const Icone = s.icone;
            return (
              <article
                key={s.rotulo}
                className={`group relative overflow-hidden rounded-[28px] p-7 transition-transform duration-300 hover:-translate-y-1 md:p-8 ${s.bg} ${s.texto} ${s.span ?? ""}`}
                style={{
                  minHeight: i === 0 || i === 3 ? "200px" : "220px",
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
                    <Icone className="size-6" />
                  </span>
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <div
                    className="font-sans tabular-nums"
                    style={{
                      fontSize:
                        s.span === "md:col-span-2" ? "5rem" : "3.75rem",
                      lineHeight: "1",
                      letterSpacing: "0",
                    }}
                  >
                    <NumeroAnimado
                      valorFinal={s.valorFinal}
                      formatador={formatarInteiro}
                    />
                  </div>
                </div>

                <p className="mt-2 text-sm font-medium opacity-80">
                  {s.unidade}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
