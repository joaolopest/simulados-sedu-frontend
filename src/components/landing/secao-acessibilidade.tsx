import {
  Accessibility,
  Brain,
  Calculator,
  Type,
  type LucideIcon,
} from "lucide-react";

interface Adaptacao {
  icone: LucideIcon;
  rotulo: string;
  descricao: string;
  bg: string;
  texto: string;
  iconeBg: string;
  iconeTexto: string;
}

const ADAPTACOES: Adaptacao[] = [
  {
    icone: Brain,
    rotulo: "TDAH",
    descricao: "Modo foco esconde a interface periférica. Uma questão por vez.",
    bg: "bg-poppy",
    texto: "text-shade",
    iconeBg: "bg-shade",
    iconeTexto: "text-poppy",
  },
  {
    icone: Type,
    rotulo: "Dislexia",
    descricao:
      "Fonte OpenDyslexic, alto contraste e tamanhos ampliados.",
    bg: "bg-canopy",
    texto: "text-shade",
    iconeBg: "bg-forest",
    iconeTexto: "text-canopy",
  },
  {
    icone: Calculator,
    rotulo: "Discalculia",
    descricao:
      "Numerais alinhados, calculadora visual e tempo flexível.",
    bg: "bg-sky",
    texto: "text-shade",
    iconeBg: "bg-iris",
    iconeTexto: "text-sky",
  },
  {
    icone: Accessibility,
    rotulo: "Autismo",
    descricao:
      "Redução de animações, transições previsíveis, linguagem direta.",
    bg: "bg-orchid",
    texto: "text-marble",
    iconeBg: "bg-marble",
    iconeTexto: "text-orchid",
  },
];

export function SecaoAcessibilidade() {
  return (
    <section
      id="acessibilidade"
      className="bg-marble transition-colors dark:bg-shade"
      data-slot="secao-acessibilidade"
      aria-labelledby="acessibilidade-titulo"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <header className="mb-12 max-w-3xl md:mb-16">
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-canopy"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 0ms backwards",
            }}
          >
            Acessibilidade
          </p>
          <h2
            id="acessibilidade-titulo"
            className="mt-4 font-sans text-shade font-display-bold dark:text-marble"
            style={{               fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: "1.06",
              letterSpacing: "-0.02em",
              animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
            }}
          >
            Aluno com adaptação responde{" "}
            <span className="text-poppy">o mesmo simulado da turma.</span>
          </h2>
          <p
            className="mt-5 max-w-2xl text-shade/75 dark:text-marble/75 md:text-[17px]"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 300ms backwards",
            }}
          >
            Acessibilidade não é versão paralela. É um conjunto de adaptações
            que vivem dentro da mesma tela. WCAG AA é piso, não teto.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {ADAPTACOES.map((a, i) => (
            <article
              key={a.rotulo}
              className={`group rounded-[28px] p-6 transition-transform duration-300 hover:-translate-y-1 md:p-7 ${a.bg} ${a.texto}`}
              style={{
                minHeight: "260px",
                animation: `slide-in-card 0.7s var(--ease-quint) ${i * 150}ms backwards`,
              }}
            >
              <span
                className={`inline-flex size-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-12 ${a.iconeBg} ${a.iconeTexto}`}
                aria-hidden
              >
                <a.icone className="size-6" />
              </span>
              <h3
                className="mt-7 font-sans"
                style={{
                  fontSize: "1.875rem",
                  lineHeight: "1.05",
                  
                  letterSpacing: "-0.02em",
                }}
              >
                {a.rotulo}
              </h3>
              <p className="mt-3 text-sm leading-[1.5] opacity-85">
                {a.descricao}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
