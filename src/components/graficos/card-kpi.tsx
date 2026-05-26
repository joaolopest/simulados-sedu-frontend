"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomKpi = "neutro" | "primario" | "alerta" | "vivo";
export type DirecaoDelta = "subindo" | "caindo" | "estavel";

export interface DeltaKpi {
  valor: string;
  direcao: DirecaoDelta;
}

export interface CardKpiProps {
  icone: LucideIcon;
  rotulo: string;
  valor: number | string;
  sufixo?: string;
  decimais?: number;
  tom?: TomKpi;
  delta?: DeltaKpi;
  delayReveal?: number;
  contarAoAparecer?: boolean;
  className?: string;
}

const TOM_CLASSES: Record<
  TomKpi,
  { borda: string; iconeBg: string; destaque: string }
> = {
  neutro: {
    borda: "border-border",
    iconeBg: "bg-muted text-muted-foreground",
    destaque: "",
  },
  primario: {
    borda: "border-primary/20",
    iconeBg: "bg-primary-muted text-primary-text",
    destaque: "",
  },
  alerta: {
    borda: "border-destructive/30",
    iconeBg: "bg-destructive-muted text-destructive",
    destaque: "",
  },
  vivo: {
    borda: "border-success/30 ring-1 ring-success/15",
    iconeBg: "bg-success-muted text-success",
    destaque: "motion-pulse-ambient",
  },
};

const DELTA_CLASSES: Record<DirecaoDelta, string> = {
  subindo: "bg-success-muted text-success",
  caindo: "bg-destructive-muted text-destructive",
  estavel: "bg-muted text-muted-foreground",
};

const DELTA_ICON: Record<DirecaoDelta, typeof ArrowUp> = {
  subindo: ArrowUp,
  caindo: ArrowDown,
  estavel: Minus,
};

export function CardKpi({
  icone: Icone,
  rotulo,
  valor,
  sufixo,
  decimais = 0,
  tom = "neutro",
  delta,
  delayReveal = 0,
  contarAoAparecer = true,
  className,
}: CardKpiProps) {
  const tomClasses = TOM_CLASSES[tom];
  const valorEhNumero = typeof valor === "number";

  return (
    <motion.article
      className={cn(
        "superficie-card p-5",
        "hover:-translate-y-0.5",
        tomClasses.borda,
        className,
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: delayReveal,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            tomClasses.iconeBg,
            tomClasses.destaque,
          )}
          aria-hidden
        >
          <Icone className="size-4" />
        </div>
        {delta && <DeltaPill delta={delta} />}
      </div>

      <p className="mt-4 font-serif text-3xl leading-none tabular-nums font-heading-stat">
        {valorEhNumero ? (
          <CounterAnimado
            valor={valor}
            sufixo={sufixo}
            decimais={decimais}
            atrasarInicio={delayReveal}
            ativo={contarAoAparecer}
          />
        ) : (
          <>
            {valor}
            {sufixo}
          </>
        )}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {rotulo}
      </p>
    </motion.article>
  );
}

function DeltaPill({ delta }: { delta: DeltaKpi }) {
  const Icone = DELTA_ICON[delta.direcao];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider tabular-nums",
        DELTA_CLASSES[delta.direcao],
      )}
    >
      <Icone className="size-3" aria-hidden />
      {delta.valor}
    </span>
  );
}

interface CounterAnimadoProps {
  valor: number;
  sufixo?: string;
  decimais: number;
  atrasarInicio: number;
  ativo: boolean;
}

function CounterAnimado({
  valor,
  sufixo,
  decimais,
  atrasarInicio,
  ativo,
}: CounterAnimadoProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducaoMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-10%" });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    duration: 1200,
    bounce: 0.15,
  });
  const formatado = useTransform(spring, (latest) =>
    latest.toLocaleString("pt-BR", {
      minimumFractionDigits: decimais,
      maximumFractionDigits: decimais,
    }),
  );

  useEffect(() => {
    if (!ativo) {
      motionValue.set(valor);
      return;
    }

    if (reducaoMotion) {
      motionValue.set(valor);
      return;
    }

    if (!inView) {
      return;
    }

    const timeout = setTimeout(() => {
      motionValue.set(valor);
    }, atrasarInicio * 1000);

    return () => clearTimeout(timeout);
  }, [ativo, atrasarInicio, inView, motionValue, reducaoMotion, valor]);

  return (
    <>
      <motion.span ref={ref}>{formatado}</motion.span>
      {sufixo}
    </>
  );
}
