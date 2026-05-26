"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatarMinutosSegundos } from "@/lib/utils";

interface CronometroSimuladoProps {
  segundosRestantes: number;
  duracaoTotalSegundos: number;
  className?: string;
  variante?: "desktop" | "mobile";
}

type EstadoCronometro = "calmo" | "atencao" | "critico" | "ultimos-segundos";

function classificar(restantes: number): EstadoCronometro {
  if (restantes <= 30) return "ultimos-segundos";
  if (restantes <= 60) return "critico";
  if (restantes <= 300) return "atencao";
  return "calmo";
}

const CLASSES_ESTADO: Record<
  EstadoCronometro,
  { container: string; texto: string; rotulo: string; pulso: string }
> = {
  calmo: {
    container: "bg-card border-border",
    texto: "text-foreground",
    rotulo: "text-muted-foreground",
    pulso: "",
  },
  atencao: {
    container: "bg-warning-muted border-warning/30",
    texto: "text-warning",
    rotulo: "text-warning/70",
    pulso: "",
  },
  critico: {
    container: "bg-destructive-muted border-destructive/40",
    texto: "text-destructive",
    rotulo: "text-destructive/70",
    pulso: "motion-hero-pulse [--pulse-color:oklch(0.501_0.193_26/0.4)]",
  },
  "ultimos-segundos": {
    container: "bg-destructive border-destructive",
    texto: "text-destructive-foreground",
    rotulo: "text-destructive-foreground/80",
    pulso: "motion-hero-pulse [--pulse-color:oklch(0.501_0.193_26/0.6)]",
  },
};

export function CronometroSimulado({
  segundosRestantes,
  duracaoTotalSegundos,
  className,
  variante = "desktop",
}: CronometroSimuladoProps) {
  const estado = classificar(segundosRestantes);
  const c = CLASSES_ESTADO[estado];
  const tempoFormatado = useMemo(
    () => formatarMinutosSegundos(Math.max(0, segundosRestantes)),
    [segundosRestantes]
  );
  const percentualUsado = Math.max(
    0,
    Math.min(
      100,
      ((duracaoTotalSegundos - segundosRestantes) / duracaoTotalSegundos) * 100
    )
  );

  if (variante === "mobile") {
    // barra fina fixa no topo do mobile
    return (
      <div
        className={cn(
          "relative h-1 w-full overflow-hidden bg-border",
          className
        )}
        role="timer"
        aria-live="off"
        aria-label={`Tempo restante: ${tempoFormatado}`}
        data-slot="cronometro-mobile"
        data-estado={estado}
      >
        <div
          className={cn(
            "h-full transition-[width,background-color] duration-500",
            "[transition-timing-function:var(--ease-quart)]",
            estado === "calmo" && "bg-primary",
            estado === "atencao" && "bg-warning",
            (estado === "critico" || estado === "ultimos-segundos") &&
              "bg-destructive"
          )}
          style={{ width: `${percentualUsado}%` }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-lg border px-4 py-2.5",
        "transition-colors duration-300 [transition-timing-function:var(--ease-quart)]",
        c.container,
        c.pulso,
        className
      )}
      role="timer"
      aria-live={estado === "ultimos-segundos" ? "assertive" : "off"}
      aria-label={`Tempo restante: ${tempoFormatado}`}
      data-slot="cronometro-simulado"
      data-estado={estado}
    >
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-mono uppercase tracking-wider text-[10px]",
            c.rotulo
          )}
        >
          Tempo restante
        </span>
        <span
          className={cn(
            "mt-1 font-mono text-2xl font-semibold tabular-nums md:text-3xl",
            c.texto
          )}
        >
          {tempoFormatado}
        </span>
      </div>
    </div>
  );
}
