"use client";

import { type CSSProperties, type RefObject } from "react";
import { Award, Building2, MapPin, Users } from "lucide-react";
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

interface TileEscola {
  inicial: string;
  nome: string;
  cidade: string;
  bg: string;
  texto: string;
  acento: string;
}

// estilo Linktree trusted-by: tiles com cores DIFERENTES por slot (cada um tem identidade)
const TILES_PRINCIPAIS: TileEscola[] = [
  {
    inicial: "VV",
    nome: "EEEFM",
    cidade: "Vila Velha",
    bg: "bg-shade",
    texto: "text-marble",
    acento: "bg-chartreuse",
  },
  {
    inicial: "CC",
    nome: "EMEF",
    cidade: "Cariacica",
    bg: "bg-chartreuse",
    texto: "text-shade",
    acento: "bg-shade",
  },
  {
    inicial: "SR",
    nome: "EEEFM",
    cidade: "Serra",
    bg: "bg-orchid",
    texto: "text-marble",
    acento: "bg-chartreuse",
  },
  {
    inicial: "VT",
    nome: "EEEFM",
    cidade: "Vitória",
    bg: "bg-poppy",
    texto: "text-shade",
    acento: "bg-shade",
  },
  {
    inicial: "CI",
    nome: "EMEF",
    cidade: "Cachoeiro",
    bg: "bg-iris",
    texto: "text-marble",
    acento: "bg-sky",
  },
  {
    inicial: "LH",
    nome: "EEEFM",
    cidade: "Linhares",
    bg: "bg-canopy",
    texto: "text-shade",
    acento: "bg-forest",
  },
  {
    inicial: "SM",
    nome: "EMEF",
    cidade: "São Mateus",
    bg: "bg-rose",
    texto: "text-marble",
    acento: "bg-chartreuse",
  },
  {
    inicial: "CL",
    nome: "EEEFM",
    cidade: "Colatina",
    bg: "bg-sky",
    texto: "text-shade",
    acento: "bg-iris",
  },
];

const ESCOLAS_MARQUEE = [
  "EEEFM Vila Velha",
  "EMEF Cariacica",
  "EEEFM Serra",
  "EEEFM Vitória",
  "EMEF Cachoeiro de Itapemirim",
  "EEEFM Linhares",
  "EMEF São Mateus",
  "EEEFM Colatina",
  "EMEF Aracruz",
  "EEEFM Guarapari",
  "EMEF Domingos Martins",
  "EEEFM Marataízes",
  "EMEF Anchieta",
  "EEEFM Castelo",
  "EMEF Viana",
];

export function MarqueeEscolas() {
  const itensMarquee = [...ESCOLAS_MARQUEE, ...ESCOLAS_MARQUEE];

  return (
    <section
      className="bg-marble"
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
            className="mt-4 font-sans text-shade font-display-bold"
            style={{               fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: "1.06",
              letterSpacing: "-0.02em",
              animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
            }}
          >
            <span className="text-rose">Quarenta e sete</span> escolas
            estaduais.
          </h2>
          <p
            className="mt-5 max-w-xl text-shade/75 md:text-[17px]"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 300ms backwards",
            }}
          >
            Da capital às cidades do interior do Espírito Santo. Cada escola
            com sua coordenação pedagógica conectada ao mesmo banco de
            questões.
          </p>
        </header>

        {/* tiles trusted-by — cada tile uma cor diferente, layout estilo Linktree */}
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {TILES_PRINCIPAIS.map((t, i) => (
            <li key={i}>
              <article
                className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-[28px] p-6 transition-transform duration-300 hover:-translate-y-1 hover:rotate-1 md:p-7 ${t.bg} ${t.texto}`}
                style={{
                  animation: `slide-in-card 0.7s var(--ease-quint) ${i * 80}ms backwards`,
                }}
              >
                {/* iniciais grandes ao centro */}
                <p
                  className="font-sans"
                  style={{
                    fontSize: "clamp(2rem, 3.5vw, 3rem)",
                    lineHeight: "1",
                    
                    letterSpacing: "-0.04em",
                  }}
                >
                  {t.inicial}
                </p>

                {/* badge canto sup direito */}
                <span
                  className={`absolute top-5 right-5 size-2.5 rounded-full ${t.acento}`}
                  aria-hidden
                />

                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {t.nome}
                  </p>
                  <p
                    className="mt-1.5 font-sans"
                    style={{
                      fontSize: "0.95rem",
                      lineHeight: "1.15",
                      
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {t.cidade}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {/* stats row */}
        <div
          className="mt-12 grid grid-cols-2 gap-3 rounded-[24px] bg-shade p-6 md:mt-16 md:grid-cols-4 md:p-8"
          style={{
            animation: "slide-in-card 0.8s var(--ease-quint) 700ms backwards",
          }}
        >
          {[
            {
              icone: Building2,
              valor: "47",
              valorFinal: 47,
              formatador: (n: number) => Math.round(n).toString(),
              rotulo: "Escolas",
              cor: "text-chartreuse",
            },
            {
              icone: MapPin,
              valor: "78",
              valorFinal: 78,
              formatador: (n: number) => Math.round(n).toString(),
              rotulo: "Municípios",
              cor: "text-poppy",
            },
            {
              icone: Users,
              valor: "12.420",
              valorFinal: 12420,
              rotulo: "Alunos",
              cor: "text-orchid",
            },
            {
              icone: Award,
              valor: "2026",
              rotulo: "Em produção",
              cor: "text-sky",
            },
          ].map((s) => (
            <div key={s.rotulo} className="flex items-center gap-4">
              <span className={`shrink-0 ${s.cor}`} aria-hidden>
                <s.icone className="size-7" />
              </span>
              <div>
                <div
                  className="font-sans text-marble tabular-nums"
                  style={{
                    fontSize: "1.625rem",
                    lineHeight: "1",
                    
                    letterSpacing: "-0.03em",
                  }}
                >
                  {s.valorFinal !== undefined ? (
                    <NumeroAnimado
                      valorFinal={s.valorFinal}
                      formatador={s.formatador}
                    />
                  ) : (
                    s.valor
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-marble/60">
                  {s.rotulo}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* marquee horizontal — escolas em loop */}
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
                
                letterSpacing: "-0.02em",
                color: "var(--color-shade)",
              }}
            >
              {escola}
              <span className="size-2 rounded-full bg-shade" aria-hidden />
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
