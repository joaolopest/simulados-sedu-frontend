import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaFinal() {
  return (
    <section
      className="relative overflow-hidden bg-hydrangea"
      data-slot="cta-final"
      aria-labelledby="cta-final-titulo"
    >
      {/* círculos decorativos atrás */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full bg-iris/40"
        style={{ animation: "pulse-ambient 6s ease-in-out infinite" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-40 size-[500px] rounded-full bg-sky/40"
        style={{ animation: "pulse-ambient 6s ease-in-out infinite 2s" }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-24 text-center md:px-8 md:py-32">
        <p
          className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-chartreuse"
          style={{
            animation: "materialize 0.6s var(--ease-quart) 0ms backwards",
          }}
        >
          Pronto pra começar
        </p>
        <h2
          id="cta-final-titulo"
          className="mt-5 max-w-4xl font-sans text-marble"
          style={{             fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            lineHeight: "1.02",
            letterSpacing: "-0.025em",
            animation: "materialize 0.7s var(--ease-quart) 150ms backwards",
          }}
        >
          Avaliar bem é{" "}
          <span className="text-chartreuse italic">avaliar com método.</span>
        </h2>
        <p
          className="mt-7 max-w-xl text-marble/85 md:text-[17px]"
          style={{
            animation: "materialize 0.6s var(--ease-quart) 400ms backwards",
          }}
        >
          Acesso fornecido pela coordenação da escola. Se você é coordenação e
          quer incluir sua escola, entre em contato com a SEDU.
        </p>

        <Link
          href="/login"
          className="motion-hero-pulse mt-10 inline-flex items-center justify-center gap-3 rounded-full bg-marble px-9 py-5 font-sans text-lg font-bold text-shade transition-all hover:bg-chartreuse active:translate-y-px"
          style={{             animation: "materialize 0.6s var(--ease-quart) 600ms backwards",
          }}
        >
          Acessar plataforma
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
