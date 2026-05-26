"use client";

import { type CSSProperties, type RefObject } from "react";
import { Bot, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
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

export function SecaoDiagnosticoReal() {
  return (
    <section
      id="diagnostico"
      className="bg-marble"
      data-slot="secao-diagnostico-real"
      aria-labelledby="diagnostico-titulo"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <header className="mb-12 grid gap-6 md:mb-16 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <p
              className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-orchid"
              style={{
                animation: "materialize 0.6s var(--ease-quart) 0ms backwards",
              }}
            >
              Diagnóstico IA
            </p>
            <h2
              id="diagnostico-titulo"
              className="mt-4 font-sans text-shade font-display-bold"
              style={{                 fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
                lineHeight: "1.06",
                letterSpacing: "-0.02em",
                animation: "materialize 0.6s var(--ease-quart) 150ms backwards",
              }}
            >
              A IA escreve.{" "}
              <span className="text-rose">A coordenação assina.</span>
            </h2>
          </div>
          <p
            className="text-shade/75 md:col-span-5 md:col-start-8 md:text-[17px]"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 300ms backwards",
            }}
          >
            Cada relatório carrega o modelo usado, o índice de confiança e os
            pontos onde a curadoria pediu revisão humana. A IA é ferramenta —
            não autoridade.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-12 md:gap-6">
          {/* card principal — diagnóstico */}
          <article
            className="overflow-hidden rounded-[32px] bg-shade p-8 md:col-span-8 md:p-10"
            style={{
              minHeight: "480px",
              animation: "slide-in-card 0.8s var(--ease-quint) 400ms backwards",
            }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="motion-hero-pulse inline-flex items-center gap-1.5 rounded-full bg-chartreuse px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-shade">
                <Sparkles className="size-3" aria-hidden /> IA
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-marble/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-marble/80">
                <Bot className="size-3" aria-hidden /> claude-opus-4-7
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-marble/50">
                04/05/2026 · 14:32
              </span>
            </div>

            <h3
              className="mt-6 font-sans text-marble"
              style={{                 fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                lineHeight: "1.1",
                letterSpacing: "-0.02em",
              }}
            >
              Matemática · 9º Ano · Turma B
            </h3>

            <ul className="mt-7 space-y-5">
              <li
                className="flex gap-4"
                style={{
                  animation:
                    "slide-in-card 0.7s var(--ease-quint) 800ms backwards",
                }}
              >
                <span
                  aria-hidden
                  className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-chartreuse text-shade"
                >
                  <TrendingUp className="size-3.5" />
                </span>
                <p className="text-marble/90 leading-[1.55] md:text-[17px]">
                  Equações do 2º grau aparecem como ponto sólido —{" "}
                  <strong className="text-chartreuse">78% de acerto</strong>,
                  acima da média estadual de 64%. A turma demonstra fluência no
                  método da fatoração.
                </p>
              </li>
              <li
                className="flex gap-4"
                style={{
                  animation:
                    "slide-in-card 0.7s var(--ease-quint) 1000ms backwards",
                }}
              >
                <span
                  aria-hidden
                  className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-rose text-marble"
                >
                  ↓
                </span>
                <p className="text-marble/90 leading-[1.55] md:text-[17px]">
                  Geometria analítica é o gargalo principal —{" "}
                  <strong className="text-rose">apenas 41% acertaram</strong>{" "}
                  questões envolvendo distância entre pontos. Padrão sugere
                  confusão entre fórmulas, não falta de conceito.
                </p>
              </li>
              <li
                className="flex gap-4"
                style={{
                  animation:
                    "slide-in-card 0.7s var(--ease-quint) 1200ms backwards",
                }}
              >
                <span
                  aria-hidden
                  className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-poppy text-shade"
                >
                  →
                </span>
                <p className="text-marble/90 leading-[1.55] md:text-[17px]">
                  Recomenda-se sequência de{" "}
                  <strong className="text-poppy">3 a 4 aulas</strong> focadas em
                  geometria analítica antes do próximo simulado, com ênfase em
                  problemas contextualizados.
                </p>
              </li>
            </ul>
          </article>

          {/* sidebar — confiança + auditável */}
          <div className="space-y-5 md:col-span-4 md:space-y-6">
            <article
              className="rounded-[32px] bg-chartreuse p-7 md:p-8"
              style={{
                minHeight: "240px",
                animation: "slide-in-card 0.8s var(--ease-quint) 550ms backwards",
              }}
            >
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-shade/70">
                Confiança da curadoria
              </p>
              <div className="mt-3 flex items-baseline gap-3">
                <p
                  className="font-sans text-shade tabular-nums"
                  style={{
                    fontSize: "clamp(4rem, 8vw, 5.5rem)",
                    lineHeight: "1",
                    
                    letterSpacing: "-0.04em",
                  }}
                >
                  <NumeroAnimado
                    valorFinal={87}
                    formatador={(n) => Math.round(n).toString()}
                  />
                </p>
                <p
                  className="font-sans text-shade/70"
                  style={{
                    fontSize: "1.5rem",
                    
                  }}
                >
                  %
                </p>
              </div>
              <p className="mt-2 inline-flex items-center rounded-full bg-shade px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-chartreuse">
                Alta · liberar direto
              </p>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-shade/15">
                <div
                  className="h-full rounded-full bg-shade"
                  style={{
                    width: "100%",
                    transformOrigin: "left",
                    animation:
                      "preencher-87 1.8s var(--ease-quint) 400ms backwards",
                  }}
                />
              </div>
            </article>

            <article
              className="rounded-[32px] bg-iris p-7 text-marble md:p-8"
              style={{
                animation: "slide-in-card 0.8s var(--ease-quint) 700ms backwards",
              }}
            >
              <span
                aria-hidden
                className="inline-flex size-10 items-center justify-center rounded-full bg-sky text-shade"
              >
                <ShieldCheck className="size-5" />
              </span>
              <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-sky">
                Auditável
              </p>
              <ul className="mt-3 space-y-2.5">
                {[
                  "Modelo registrado",
                  "Confiança em 3 níveis",
                  "Fallback automático",
                  "Trilha completa",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm font-bold"
                  >
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-chartreuse"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </div>
      <style>{`@keyframes preencher-87 { from { transform: scaleX(0); } to { transform: scaleX(0.87); } }`}</style>
    </section>
  );
}
