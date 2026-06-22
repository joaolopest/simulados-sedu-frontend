"use client";

import Image from "next/image";
import { useLandingPublica } from "@/hooks/api/use-publico";

interface EstiloDepoimento {
  src: string;
  blobBg: string;
  blobAcento: string;
  pillBg: string;
  pillTexto: string;
}

const ESTILOS: Record<string, EstiloDepoimento> = {
  gestor: {
    src: "/imagens/coordenadora.svg",
    blobBg: "bg-iris",
    blobAcento: "bg-sky",
    pillBg: "bg-chartreuse",
    pillTexto: "text-shade",
  },
  professor: {
    src: "/imagens/professor.svg",
    blobBg: "bg-chartreuse",
    blobAcento: "bg-olive",
    pillBg: "bg-orchid",
    pillTexto: "text-marble",
  },
  aluno: {
    src: "/imagens/aluno.svg",
    blobBg: "bg-rose-pale",
    blobAcento: "bg-dahlia",
    pillBg: "bg-poppy",
    pillTexto: "text-shade",
  },
};

export function SecaoDepoimentos() {
  const { data } = useLandingPublica();
  const depoimentos = data?.depoimentos ?? [];

  if (depoimentos.length === 0) return null;

  return (
    <section
      id="depoimentos"
      className="bg-marble transition-colors dark:bg-shade"
      data-slot="secao-depoimentos"
      aria-labelledby="depoimentos-titulo"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <header className="mb-12 max-w-3xl md:mb-16">
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-currant"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 0ms backwards",
            }}
          >
            Quem está usando
          </p>
          <h2
            className="mt-4 font-sans text-shade font-display-bold dark:text-marble"
            id="depoimentos-titulo"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: "1.06",
              letterSpacing: "0",
              animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
            }}
          >
            Confiável, <span className="text-orchid italic">com dados reais.</span>
          </h2>
          <p
            className="mt-5 max-w-xl text-shade/75 dark:text-marble/75 md:text-[17px]"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 300ms backwards",
            }}
          >
            Perfis carregados do banco mostram como a rede está organizada por
            escola, função e acompanhamento.
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {depoimentos.map((depoimento, i) => (
            <li key={`${depoimento.tipo}-${depoimento.nome}`}>
              <CardTestimonial
                depoimento={depoimento}
                estilo={ESTILOS[depoimento.tipo] ?? ESTILOS.gestor}
                indice={i}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CardTestimonial({
  depoimento,
  estilo,
  indice,
}: {
  depoimento: {
    nome: string;
    papel: string;
    escola: string;
    tipo: string;
    quote: string;
  };
  estilo: EstiloDepoimento;
  indice: number;
}) {
  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-[32px] border-2 border-shade transition-transform duration-300 hover:-translate-y-1 hover:rotate-[-0.5deg] dark:border-marble"
      style={{
        animation: `slide-in-card 0.8s var(--ease-quint) ${indice * 180}ms backwards`,
      }}
    >
      <div className={`relative aspect-[4/3] overflow-hidden ${estilo.blobBg}`}>
        <span
          aria-hidden
          className={`absolute -bottom-12 -left-12 size-72 rounded-full ${estilo.blobAcento} opacity-90`}
        />
        <span
          aria-hidden
          className={`absolute -top-12 -right-12 size-56 rounded-full ${estilo.blobAcento} opacity-50`}
        />
        <Image
          src={estilo.src}
          alt={depoimento.papel}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="relative z-10 object-cover [filter:grayscale(100%)_contrast(1.15)] mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
          loading={indice === 0 ? "eager" : "lazy"}
        />
        <span
          className={`absolute bottom-4 left-4 z-20 inline-flex items-center rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest ${estilo.pillBg} ${estilo.pillTexto}`}
        >
          {depoimento.papel}
        </span>
      </div>

      <div className="flex flex-1 flex-col bg-marble p-6 transition-colors dark:bg-shade md:p-7">
        <blockquote
          className="font-sans text-shade font-display-semibold dark:text-marble"
          style={{
            fontSize: "1.0625rem",
            lineHeight: "1.45",
            letterSpacing: "0",
          }}
        >
          “{depoimento.quote}”
        </blockquote>

        <footer className="mt-6 border-t-2 border-shade/10 pt-4 dark:border-marble/15">
          <p className="font-sans text-base font-bold text-shade dark:text-marble">
            {depoimento.nome}
          </p>
          <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-shade/60 dark:text-marble/60">
            {depoimento.escola}
          </p>
        </footer>
      </div>
    </article>
  );
}
