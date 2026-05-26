interface Depoimento {
  src: string;
  alt: string;
  quote: string;
  nome: string;
  papel: string;
  escola: string;
  blobBg: string;
  blobAcento: string;
  pillBg: string;
  pillTexto: string;
}

const DEPOIMENTOS: Depoimento[] = [
  {
    src: "/imagens/coordenadora.svg",
    alt: "Ana Lúcia Pereira, coordenadora pedagógica",
    quote:
      "Antes a gente recebia o diagnóstico do simulado três semanas depois. Hoje, no mesmo dia em que o último aluno entrega, eu sento com o professor e a gente decide o que muda na semana seguinte.",
    nome: "Ana Lúcia Pereira",
    papel: "Coordenação pedagógica",
    escola: "EEEFM Vila Velha",
    blobBg: "bg-iris",
    blobAcento: "bg-sky",
    pillBg: "bg-chartreuse",
    pillTexto: "text-shade",
  },
  {
    src: "/imagens/professor.svg",
    alt: "Carlos Eduardo Santos, professor de Matemática",
    quote:
      "O que mudou foi receber a leitura por competência. Em vez de uma média geral que não diz nada, eu vejo onde a turma travou. A próxima aula sai diferente — sem achismo.",
    nome: "Carlos Eduardo Santos",
    papel: "Professor de Matemática",
    escola: "EMEF Cariacica",
    blobBg: "bg-chartreuse",
    blobAcento: "bg-olive",
    pillBg: "bg-orchid",
    pillTexto: "text-marble",
  },
  {
    src: "/imagens/aluno.svg",
    alt: "Estudante de 9º ano",
    quote:
      "Tenho TDAH e respondia simulado em sala separada. Agora respondo o mesmo simulado da turma, com modo foco que esconde tudo que distrai. É só meu, sem ser à parte.",
    nome: "Estudante · 9º Ano",
    papel: "Identidade preservada",
    escola: "EEEFM Serra",
    blobBg: "bg-rose-pale",
    blobAcento: "bg-dahlia",
    pillBg: "bg-poppy",
    pillTexto: "text-shade",
  },
];

export function SecaoDepoimentos() {
  return (
    <section
      id="depoimentos"
      className="bg-marble"
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
            className="mt-4 font-sans text-shade font-display-bold"
            id="depoimentos-titulo"
            style={{               fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: "1.06",
              letterSpacing: "-0.02em",
              animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
            }}
          >
            Confiável,{" "}
            <span className="text-orchid italic">de verdade.</span>
          </h2>
          <p
            className="mt-5 max-w-xl text-shade/75 md:text-[17px]"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 300ms backwards",
            }}
          >
            Coordenadores, professores e estudantes da rede estadual descrevem
            o que mudou no trabalho pedagógico depois que o ciclo virou diário.
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {DEPOIMENTOS.map((d, i) => (
            <li key={d.nome}>
              <CardTestimonial depoimento={d} indice={i} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CardTestimonial({
  depoimento: d,
  indice,
}: {
  depoimento: Depoimento;
  indice: number;
}) {
  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-[32px] border-2 border-shade transition-transform duration-300 hover:-translate-y-1 hover:rotate-[-0.5deg]"
      style={{
        animation: `slide-in-card 0.8s var(--ease-quint) ${indice * 180}ms backwards`,
      }}
    >
      {/* área da foto — cutout signature Linktree */}
      <div className={`relative aspect-[4/3] overflow-hidden ${d.blobBg}`}>
        {/* blob 1 */}
        <span
          aria-hidden
          className={`absolute -bottom-12 -left-12 size-72 rounded-full ${d.blobAcento} opacity-90`}
        />
        {/* blob 2 */}
        <span
          aria-hidden
          className={`absolute -top-12 -right-12 size-56 rounded-full ${d.blobAcento} opacity-50`}
        />
        {/* retrato */}
        <img
          src={d.src}
          alt={d.alt}
          className="relative z-10 size-full object-cover [filter:grayscale(100%)_contrast(1.15)] mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
          loading={indice === 0 ? "eager" : "lazy"}
        />
        {/* pill com nome flutuante */}
        <span
          className={`absolute bottom-4 left-4 z-20 inline-flex items-center rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest ${d.pillBg} ${d.pillTexto}`}
        >
          {d.papel}
        </span>
      </div>

      <div className="flex flex-1 flex-col bg-marble p-6 md:p-7">
        <blockquote
          className="font-sans text-shade font-display-semibold"
          style={{
            fontSize: "1.0625rem",
            lineHeight: "1.45",
            letterSpacing: "-0.012em",
          }}
        >
          “{d.quote}”
        </blockquote>

        <footer className="mt-6 border-t-2 border-shade/10 pt-4">
          <p className="font-sans text-base font-bold text-shade">{d.nome}</p>
          <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-shade/60">
            {d.escola}
          </p>
        </footer>
      </div>
    </article>
  );
}
