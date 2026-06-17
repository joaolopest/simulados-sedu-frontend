"use client";

import { type CSSProperties, type RefObject } from "react";
import { Award, Building2, MapPin, Users } from "lucide-react";
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

const ESTILOS_TILE = [
  { bg: "bg-shade", texto: "text-marble", acento: "bg-chartreuse" },
  { bg: "bg-chartreuse", texto: "text-shade", acento: "bg-shade" },
  { bg: "bg-orchid", texto: "text-marble", acento: "bg-chartreuse" },
  { bg: "bg-poppy", texto: "text-shade", acento: "bg-shade" },
  { bg: "bg-iris", texto: "text-marble", acento: "bg-sky" },
  { bg: "bg-canopy", texto: "text-shade", acento: "bg-forest" },
  { bg: "bg-rose", texto: "text-marble", acento: "bg-chartreuse" },
  { bg: "bg-sky", texto: "text-shade", acento: "bg-iris" },
] as const;

const formatarInteiro = (n: number) => Math.round(n).toLocaleString("pt-BR");

export function MarqueeEscolas() {
  const { data } = useLandingPublica();
  const metricas = data?.metricas;
  const escolas = data?.escolas ?? [];
  const tiles = escolas.slice(0, 8).map((escola, indice) => ({
    ...escola,
    estilo: ESTILOS_TILE[indice % ESTILOS_TILE.length],
  }));
  const nomesMarquee = escolas.map((e) => `${e.nome} · ${e.municipio}`);
  const itensMarquee = [...nomesMarquee, ...nomesMarquee];

  const stats = [
    {
      icone: Building2,
      valorFinal: metricas?.totalEscolas ?? 0,
      rotulo: "Escolas",
      cor: "text-chartreuse",
    },
    {
      icone: MapPin,
      valorFinal: metricas?.totalMunicipios ?? 0,
      rotulo: "Municipios",
      cor: "text-poppy",
    },
    {
      icone: Users,
      valorFinal: metricas?.totalAlunos ?? 0,
      rotulo: "Alunos",
      cor: "text-orchid",
    },
    {
      icone: Award,
      valorFinal: metricas?.anoReferencia ?? new Date().getFullYear(),
      rotulo: "Em producao",
      cor: "text-sky",
    },
  ];

  return (
    <section
      className="bg-marble transition-colors dark:bg-shade"
      data-slot="trusted-by-tiles"
      aria-labelledby="trusted-titulo"
    >
      <div className="mx-auto w-full max-w-7xl px-4 pt-20 md:px-8 md:pt-28">
        <header className="mb-12 max-w-3xl md:mb-16">
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-hydrangea"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 0ms backwards",
            }}
          >
            Em uso na rede
          </p>
          <h2
            id="trusted-titulo"
            className="mt-4 font-sans text-shade font-display-bold dark:text-marble"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: "1.06",
              letterSpacing: "0",
              animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
            }}
          >
            <span className="text-rose">
              {formatarInteiro(metricas?.totalEscolas ?? 0)}
            </span>{" "}
            escolas estaduais.
          </h2>
          <p
            className="mt-5 max-w-xl text-shade/75 dark:text-marble/75 md:text-[17px]"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 300ms backwards",
            }}
          >
            Dados carregados do banco da aplicação: escolas, turmas e alunos
            conectados ao mesmo banco de questões.
          </p>
        </header>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {tiles.map((t, i) => (
            <li key={t.id}>
              <article
                className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-[28px] p-6 transition-transform duration-300 hover:-translate-y-1 hover:rotate-1 md:p-7 ${t.estilo.bg} ${t.estilo.texto}`}
                style={{
                  animation: `slide-in-card 0.7s var(--ease-quint) ${i * 80}ms backwards`,
                }}
              >
                <p
                  className="font-sans"
                  style={{
                    fontSize: "clamp(2rem, 3.5vw, 3rem)",
                    lineHeight: "1",
                    letterSpacing: "0",
                  }}
                >
                  {t.inicial}
                </p>
                <span
                  className={`absolute top-5 right-5 size-2.5 rounded-full ${t.estilo.acento}`}
                  aria-hidden
                />
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {t.totalTurmas} turmas
                  </p>
                  <p
                    className="mt-1.5 font-sans"
                    style={{
                      fontSize: "0.95rem",
                      lineHeight: "1.15",
                      letterSpacing: "0",
                    }}
                  >
                    {t.municipio}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div
          className="mt-12 grid grid-cols-2 gap-3 rounded-[24px] bg-shade p-6 md:mt-16 md:grid-cols-4 md:p-8"
          style={{
            animation: "slide-in-card 0.8s var(--ease-quint) 700ms backwards",
          }}
        >
          {stats.map((s) => {
            const Icone = s.icone;
            return (
              <div key={s.rotulo} className="flex items-center gap-4">
                <span className={`shrink-0 ${s.cor}`} aria-hidden>
                  <Icone className="size-7" />
                </span>
                <div>
                  <div
                    className="font-sans text-marble tabular-nums"
                    style={{
                      fontSize: "1.625rem",
                      lineHeight: "1",
                      letterSpacing: "0",
                    }}
                  >
                    <NumeroAnimado
                      valorFinal={s.valorFinal}
                      formatador={formatarInteiro}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-marble/60">
                    {s.rotulo}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {itensMarquee.length > 0 && (
        <div className="relative mt-16 overflow-hidden border-y-2 border-shade bg-chartreuse py-6 md:mt-20">
          <ul
            className="flex gap-10 whitespace-nowrap"
            style={{
              animation: "marquee-scroll 38s linear infinite",
              width: "max-content",
            }}
          >
            {itensMarquee.map((escola, i) => (
              <li
                key={`${escola}-${i}`}
                className="flex items-center gap-3 font-sans"
                style={{
                  fontSize: "1.5rem",
                  letterSpacing: "0",
                  color: "var(--color-shade)",
                }}
              >
                {escola}
                <span className="size-2 rounded-full bg-shade" aria-hidden />
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
