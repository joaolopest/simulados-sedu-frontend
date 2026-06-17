import {
  Database,
  GraduationCap,
  Pencil,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface Passo {
  numero: string;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  bg: string;
  texto: string;
  pillBg: string;
  pillTexto: string;
  iconeAcento: string;
  destaque?: string;
  destaqueCor?: string;
}

const PASSOS: Passo[] = [
  {
    numero: "01",
    titulo: "Importar o banco",
    descricao:
      "A Secretaria importa o JSON com séries, matérias, conteúdos da BNCC e adaptações cognitivas. O sistema valida cada item linha por linha.",
    icone: Database,
    bg: "bg-chartreuse",
    texto: "text-shade",
    pillBg: "bg-shade",
    pillTexto: "text-marble",
    iconeAcento: "text-forest",
    destaque: "60+ questões em 4s",
    destaqueCor: "bg-shade text-chartreuse",
  },
  {
    numero: "02",
    titulo: "Configurar o simulado",
    descricao:
      "Coordenador escolhe turma, conteúdos e distribuição de dificuldade — fácil/médio/difícil somando 100%. Adaptações entram na mesma prova.",
    icone: Pencil,
    bg: "bg-lavender",
    texto: "text-shade",
    pillBg: "bg-orchid",
    pillTexto: "text-marble",
    iconeAcento: "text-dahlia",
    destaque: "Wizard de 4 passos",
    destaqueCor: "bg-orchid text-marble",
  },
  {
    numero: "03",
    titulo: "IA monta com índice de confiança",
    descricao:
      "Claude Opus monta, valida o equilíbrio e devolve confiança auditável. Acima de 80% libera direto. Abaixo de 60%, revisão obrigatória.",
    icone: Sparkles,
    bg: "bg-iris",
    texto: "text-marble",
    pillBg: "bg-chartreuse",
    pillTexto: "text-shade",
    iconeAcento: "text-sky",
    destaque: "8 a 12s · auditável",
    destaqueCor: "bg-sky text-shade",
  },
  {
    numero: "04",
    titulo: "Diagnóstico no mesmo dia",
    descricao:
      "Aluno responde com autosave que tolera queda de conexão. Conforme o último entrega, o relatório pedagógico já está escrito.",
    icone: GraduationCap,
    bg: "bg-rose",
    texto: "text-marble",
    pillBg: "bg-shade",
    pillTexto: "text-chartreuse",
    iconeAcento: "text-poppy",
    destaque: "Resultado no mesmo dia",
    destaqueCor: "bg-poppy text-shade",
  },
];

export function SecaoComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="bg-marble transition-colors dark:bg-shade"
      data-slot="secao-como-funciona"
      aria-labelledby="como-funciona-titulo"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <header className="mb-12 max-w-3xl md:mb-16">
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-orchid"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 0ms backwards",
            }}
          >
            Como funciona
          </p>
          <h2
            id="como-funciona-titulo"
            className="mt-4 font-sans text-shade font-display-bold dark:text-marble"
            style={{               fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: "1.06",
              letterSpacing: "-0.02em",
              animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
            }}
          >
            Crie e acompanhe simulados em{" "}
            <span className="text-rose">quatro passos.</span>
          </h2>
        </header>

        {/* grid 2x2 — cada passo uma cor diferente */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {PASSOS.map((p, i) => (
            <article
              key={p.numero}
              className={`group relative overflow-hidden rounded-[32px] p-8 transition-transform duration-300 hover:-translate-y-1 md:p-10 ${p.bg} ${p.texto}`}
              style={{
                minHeight: "340px",
                animation: `slide-in-card 0.8s var(--ease-quint) ${i * 150}ms backwards`,
              }}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 font-mono text-xs font-bold ${p.pillBg} ${p.pillTexto}`}
                >
                  {p.numero}
                </span>
                <p.icone
                  className={`size-8 ${p.iconeAcento} transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110`}
                  aria-hidden
                />
              </div>

              <h3
                className="mt-7 font-sans"
                style={{
                  fontSize: "clamp(1.625rem, 2.5vw, 2.125rem)",
                  lineHeight: "1.1",
                  
                  letterSpacing: "-0.02em",
                }}
              >
                {p.titulo}
              </h3>

              <p className="mt-4 text-[15px] leading-[1.55] opacity-90 md:text-base">
                {p.descricao}
              </p>

              {p.destaque && (
                <span
                  className={`mt-6 inline-flex items-center rounded-full px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${p.destaqueCor}`}
                >
                  {p.destaque}
                </span>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
