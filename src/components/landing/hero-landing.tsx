"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import {
  ArrowRight,
  GraduationCap,
  ListChecks,
  School,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useContadorAnimado } from "@/hooks/use-contador-animado";

function PalavraReveal({
  delay,
  children,
}: {
  delay: number;
  children: ReactNode;
}) {
  return (
    <span
      className="inline-block"
      style={{
        animation: `mask-reveal-rtl 0.7s var(--ease-snap) ${delay}ms backwards`,
      }}
    >
      {children}
    </span>
  );
}

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

function CardMockup({
  baseRotation,
  scrollFactor,
  scrollY,
  delay,
  className,
  style,
  children,
}: {
  baseRotation: number;
  scrollFactor: number;
  scrollY: number;
  delay: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const translateY = Math.max(-12, Math.min(12, scrollY * scrollFactor * -1));
  const transformComposto = hover
    ? `rotate(${baseRotation}deg) rotateX(2deg) rotateY(-2deg) scale(1.02) translateY(${translateY}px)`
    : `rotate(${baseRotation}deg) translateY(${translateY}px)`;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{
        ...style,
        transform: transformComposto,
        transition: "transform 400ms var(--ease-quint)",
        animation: `slide-in-card 0.7s var(--ease-quint) ${delay}ms backwards`,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

export function HeroLanding() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const aoScrollar = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", aoScrollar, { passive: true });
    return () => window.removeEventListener("scroll", aoScrollar);
  }, []);

  return (
    <section
      className="relative overflow-hidden bg-marble"
      data-slot="hero-landing"
      aria-labelledby="hero-titulo"
    >
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pt-16 pb-20 md:grid-cols-12 md:gap-8 md:px-8 md:pt-24 md:pb-28">
        {/* coluna texto */}
        <div className="md:col-span-7">
          {/* badge eyebrow — materialize delay 0 */}
          <span
            className="inline-flex items-center gap-2 rounded-full bg-shade px-4 py-2"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 0ms backwards",
            }}
          >
            <span className="size-1.5 rounded-full bg-chartreuse" aria-hidden />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-marble">
              Secretaria do Espírito Santo
            </span>
          </span>

          {/* h1 — mask-reveal-rtl word-by-word stagger 80ms */}
          <h1
            id="hero-titulo"
            className="mt-6 font-sans text-shade font-display-bold"
            style={{               fontSize: "clamp(2.75rem, 7vw, 5rem)",
              lineHeight: "1.04",
              letterSpacing: "-0.025em",
            }}
          >
            <PalavraReveal delay={0}>Avaliação</PalavraReveal>{" "}
            <PalavraReveal delay={80}>que</PalavraReveal>{" "}
            <PalavraReveal delay={160}>vira</PalavraReveal>{" "}
            <PalavraReveal delay={240}>
              <span className="relative inline-block">
                <span className="relative z-10 text-shade">decisão</span>
                <span
                  aria-hidden
                  className="absolute -inset-x-1 inset-y-1.5 z-0 rounded-md bg-chartreuse"
                />
              </span>
            </PalavraReveal>{" "}
            <PalavraReveal delay={320}>
              <span className="text-orchid italic">no mesmo dia.</span>
            </PalavraReveal>
          </h1>

          {/* descrição — materialize delay 600 */}
          <p
            className="mt-7 max-w-xl text-shade/75"
            style={{
              fontSize: "clamp(1.0625rem, 1.5vw, 1.25rem)",
              lineHeight: "1.5",
              animation: "materialize 0.6s var(--ease-quart) 600ms backwards",
            }}
          >
            Plataforma estadual de simulados com IA auditável. Da Secretaria à
            sala de aula em um único fluxo — do último aluno entregando até o
            diagnóstico chegar pro coordenador, no mesmo dia.
          </p>

          {/* CTAs — materialize delay 800 */}
          <div
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{
              animation: "materialize 0.6s var(--ease-quart) 800ms backwards",
            }}
          >
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-shade px-7 py-4 text-base font-bold text-marble transition-all hover:bg-shade/90 active:translate-y-px"
            >
              Acessar plataforma
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-full border-2 border-shade px-7 py-[14px] text-base font-bold text-shade transition-all hover:bg-shade hover:text-marble active:translate-y-px"
            >
              Ver como funciona
            </a>
          </div>

          {/* badges flutuantes — stagger 1000/1100/1200 + counter animado */}
          <div className="mt-12 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full bg-chartreuse px-4 py-2"
              style={{
                animation:
                  "materialize 0.5s var(--ease-quart) 1000ms backwards",
              }}
            >
              <School className="size-3.5 text-shade" aria-hidden />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-shade tabular-nums">
                <NumeroAnimado valorFinal={47} /> escolas
              </span>
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full bg-orchid px-4 py-2"
              style={{
                animation:
                  "materialize 0.5s var(--ease-quart) 1100ms backwards",
              }}
            >
              <GraduationCap className="size-3.5 text-marble" aria-hidden />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-marble tabular-nums">
                <NumeroAnimado valorFinal={12420} /> alunos
              </span>
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full bg-poppy px-4 py-2"
              style={{
                animation:
                  "materialize 0.5s var(--ease-quart) 1200ms backwards",
              }}
            >
              <Sparkles className="size-3.5 text-shade" aria-hidden />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-shade">
                IA auditável
              </span>
            </span>
          </div>
        </div>

        {/* mockup multi-device */}
        <div className="relative md:col-span-5">
          <MockupHero scrollY={scrollY} />
        </div>
      </div>
    </section>
  );
}

function MockupHero({ scrollY }: { scrollY: number }) {
  return (
    <div
      className="relative mx-auto h-[560px] w-full max-w-md md:h-[600px]"
      style={{ perspective: "1000px" }}
    >
      {/* ===== ATMOSPHERIC GLOWS — camada de fundo ===== */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-12 left-4 size-[340px] md:left-6"
        style={{
          background: "radial-gradient(circle, #061492 0%, transparent 70%)",
          filter: "blur(70px)",
          opacity: 0.55,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-4 -right-4 size-[280px] md:right-0"
        style={{
          background: "radial-gradient(circle, #d2e823 0%, transparent 70%)",
          filter: "blur(70px)",
          opacity: 0.75,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-2 bottom-0 size-[300px] md:right-8"
        style={{
          background: "radial-gradient(circle, #cc01dd 0%, transparent 70%)",
          filter: "blur(70px)",
          opacity: 0.65,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-28 size-[240px] md:right-4"
        style={{
          background: "radial-gradient(circle, #02acc4 0%, transparent 70%)",
          filter: "blur(70px)",
          opacity: 0.7,
        }}
      />

      {/* ===== CARDS — camada superior z-10, com tilt 3D + parallax + slide-in ===== */}

      {/* phone iris */}
      <CardMockup
        baseRotation={0}
        scrollFactor={0.05}
        scrollY={scrollY}
        delay={400}
        className="absolute top-4 left-0 z-10 h-[480px] w-[270px] overflow-hidden rounded-[40px] bg-iris p-4 md:left-2"
        style={{ boxShadow: "0 24px 0 0 rgba(0,0,0,0.10)" }}
      >
        <div
          className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-marble/30"
          aria-hidden
        />
        <div className="mt-6 flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-chartreuse text-2xl font-black text-shade">
            AL
          </div>
          <p className="mt-3 font-sans text-base font-bold text-marble">
            @ana.lucia
          </p>
          <p className="mt-0.5 font-mono text-[10px] tracking-widest text-marble/70 uppercase">
            EEEFM Vila Velha · 9º ano
          </p>
        </div>
        <ul className="mt-6 space-y-2">
          {[
            {
              rotulo: "Matemática · Simulado 04",
              cor: "bg-chartreuse text-shade",
              status: "✓",
            },
            {
              rotulo: "Português · em curso",
              cor: "bg-poppy text-shade",
              status: "•",
            },
            {
              rotulo: "Ciências · 02 dez",
              cor: "bg-marble/15 text-marble border border-marble/20",
              status: "→",
            },
            {
              rotulo: "Histórico completo",
              cor: "bg-marble/15 text-marble border border-marble/20",
              status: "→",
            },
          ].map((s) => (
            <li
              key={s.rotulo}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold ${s.cor}`}
            >
              <span className="truncate">{s.rotulo}</span>
              <span aria-hidden className="ml-2 shrink-0">
                {s.status}
              </span>
            </li>
          ))}
        </ul>
      </CardMockup>

      {/* stat chartreuse 92% */}
      <CardMockup
        baseRotation={2}
        scrollFactor={0.08}
        scrollY={scrollY}
        delay={550}
        className="absolute -right-2 top-0 z-10 w-[210px] rounded-3xl bg-chartreuse p-5 md:right-0"
        style={{ boxShadow: "0 16px 0 0 rgba(0,0,0,0.10)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-shade" aria-hidden />
          <span className="font-mono text-[10px] font-bold tracking-widest text-shade uppercase">
            Confiança IA
          </span>
        </div>
        <p
          className="mt-3 font-sans text-shade tabular-nums"
          style={{
            fontSize: "3.25rem",
            lineHeight: "1",
            
            letterSpacing: "-0.04em",
          }}
        >
          <NumeroAnimado
            valorFinal={92}
            formatador={(n) => Math.round(n).toString()}
          />
          %
        </p>
        <p className="mt-1 inline-flex rounded-full bg-shade px-2 py-1 text-[10px] font-bold text-chartreuse">
          alta · liberar
        </p>
      </CardMockup>

      {/* form orchid */}
      <CardMockup
        baseRotation={-2}
        scrollFactor={0.1}
        scrollY={scrollY}
        delay={700}
        className="absolute right-4 -bottom-2 z-10 w-[230px] rounded-3xl bg-orchid p-5 md:right-12"
        style={{ boxShadow: "0 16px 0 0 rgba(0,0,0,0.12)" }}
      >
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-marble" aria-hidden />
          <span className="font-mono text-[10px] font-bold tracking-widest text-marble uppercase">
            Novo simulado
          </span>
        </div>
        <p
          className="mt-2 font-sans text-marble"
          style={{
            fontSize: "1.5rem",
            lineHeight: "1.1",
            
            letterSpacing: "-0.02em",
          }}
        >
          Geometria analítica
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-marble/20 px-3 py-1 text-[10px] font-bold text-marble">
            9º ano
          </span>
          <span className="rounded-full bg-marble/20 px-3 py-1 text-[10px] font-bold text-marble">
            20 q.
          </span>
        </div>
      </CardMockup>

      {/* stat sky +18% */}
      <CardMockup
        baseRotation={3}
        scrollFactor={0.06}
        scrollY={scrollY}
        delay={850}
        className="absolute right-0 bottom-32 z-10 w-[170px] rounded-3xl bg-sky p-4 md:right-2"
        style={{ boxShadow: "0 12px 0 0 rgba(0,0,0,0.10)" }}
      >
        <TrendingUp className="size-5 text-shade" aria-hidden />
        <p
          className="mt-2 font-sans text-shade tabular-nums"
          style={{
            fontSize: "1.75rem",
            lineHeight: "1",
            
            letterSpacing: "-0.03em",
          }}
        >
          +
          <NumeroAnimado
            valorFinal={18}
            formatador={(n) => Math.round(n).toString()}
          />
          %
        </p>
        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-shade/70">
          vs simulado anterior
        </p>
      </CardMockup>

      {/* badge 'ao vivo' canopy — slide-in delay 1000 + pulse */}
      <span
        className="absolute -top-4 right-32 z-10 inline-flex items-center gap-2 rounded-full bg-canopy px-3 py-1.5"
        style={{
          boxShadow: "0 8px 0 0 rgba(0,0,0,0.10)",
          animation: "slide-in-card 0.6s var(--ease-quint) 1000ms backwards",
        }}
      >
        <span
          className="size-1.5 rounded-full bg-shade motion-pulse-ambient"
          aria-hidden
        />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-shade">
          ao vivo
        </span>
      </span>
    </div>
  );
}
