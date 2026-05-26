"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomPersona =
  | "aprendizado"
  | "missao"
  | "autoridade"
  | "ia"
  | "neutro";

const TOM_PERSONA: Record<
  TomPersona,
  { halo: string; icone: string; bordaHover: string; ringHover: string }
> = {
  aprendizado: {
    halo: "bg-success-muted",
    icone: "text-success",
    bordaHover: "group-hover:border-success/40",
    ringHover: "group-hover:ring-success/10",
  },
  missao: {
    halo: "bg-warning-muted",
    icone: "text-warning",
    bordaHover: "group-hover:border-warning/40",
    ringHover: "group-hover:ring-warning/10",
  },
  autoridade: {
    halo: "bg-primary-muted",
    icone: "text-primary-text",
    bordaHover: "group-hover:border-primary/40",
    ringHover: "group-hover:ring-primary/10",
  },
  ia: {
    halo: "bg-ia-muted",
    icone: "text-ia-text",
    bordaHover: "group-hover:border-ia/40",
    ringHover: "group-hover:ring-ia/10",
  },
  neutro: {
    halo: "bg-muted",
    icone: "text-muted-foreground",
    bordaHover: "group-hover:border-border",
    ringHover: "group-hover:ring-border/30",
  },
};

export interface Persona {
  id: string;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  href: string;
  tom?: TomPersona;
  desabilitado?: boolean;
}

export interface PersonaSelectorProps {
  personas: ReadonlyArray<Persona>;
  delayInicial?: number;
  className?: string;
  ariaLabel?: string;
}

export function PersonaSelector({
  personas,
  delayInicial = 0,
  className,
  ariaLabel = "Escolha como você acessa o sistema",
}: PersonaSelectorProps) {
  return (
    <ul
      aria-label={ariaLabel}
      className={cn(
        "grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {personas.map((persona, indice) => (
        <CardPersona
          key={persona.id}
          persona={persona}
          delay={delayInicial + indice * 0.08}
        />
      ))}
    </ul>
  );
}

interface CardPersonaProps {
  persona: Persona;
  delay: number;
}

function CardPersona({ persona, delay }: CardPersonaProps) {
  const reducaoMotion = useReducedMotion();
  const tom = TOM_PERSONA[persona.tom ?? "neutro"];
  const Icone = persona.icone;

  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
            tom.halo,
          )}
        >
          <Icone className={cn("size-5", tom.icone)} />
        </div>
        <ChevronRight
          aria-hidden
          className={cn(
            "size-4 shrink-0 translate-x-0 text-muted-foreground transition-all duration-200",
            "[transition-timing-function:var(--ease-editorial)]",
            "group-hover:translate-x-0.5 group-hover:text-foreground",
          )}
        />
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <h3
          className="text-base text-foreground"
        >
          {persona.titulo}
        </h3>
        <p className="text-sm leading-snug text-muted-foreground">
          {persona.descricao}
        </p>
      </div>
    </>
  );

  const classesCard = cn(
    "group relative flex h-full min-h-[148px] flex-col rounded-xl border border-border bg-card p-5",
    "ring-1 ring-transparent",
    "transition-all duration-300 [transition-timing-function:var(--ease-editorial)]",
    !persona.desabilitado &&
      "hover:-translate-y-0.5 hover:shadow-[0_1px_3px_oklch(0.18_0.024_263_/_0.04),0_8px_24px_oklch(0.18_0.024_263_/_0.05)]",
    !persona.desabilitado && tom.bordaHover,
    !persona.desabilitado && tom.ringHover,
    persona.desabilitado && "pointer-events-none opacity-60",
  );

  return (
    <motion.li
      initial={reducaoMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      className="h-full"
    >
      {persona.desabilitado ? (
        <div
          className={classesCard}
          aria-disabled
          role="button"
          tabIndex={-1}
        >
          {conteudo}
        </div>
      ) : (
        <Link
          href={persona.href}
          aria-label={`${persona.titulo} — ${persona.descricao}`}
          className={cn(
            classesCard,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {conteudo}
        </Link>
      )}
    </motion.li>
  );
}
