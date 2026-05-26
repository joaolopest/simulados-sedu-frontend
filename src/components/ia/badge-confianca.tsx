"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type NivelConfianca = "alta" | "media" | "baixa";

interface BadgeConfiancaProps {
  percentual: number;
  rotulo?: string;
  tamanho?: "sm" | "md" | "lg";
  exibirFlag?: boolean;
  className?: string;
}

const TAMANHOS = {
  sm: { box: "size-16", numero: "text-base", rotulo: "text-[9px]", stroke: 4 },
  md: { box: "size-24", numero: "text-2xl", rotulo: "text-[10px]", stroke: 5 },
  lg: { box: "size-32", numero: "text-4xl", rotulo: "text-xs", stroke: 6 },
} as const;

function classificar(percentual: number): NivelConfianca {
  if (percentual >= 80) return "alta";
  if (percentual >= 60) return "media";
  return "baixa";
}

const CLASSES_NIVEL: Record<
  NivelConfianca,
  { ring: string; texto: string; pista: string; rotuloPadrao: string }
> = {
  alta: {
    ring: "stroke-success",
    texto: "text-success",
    pista: "stroke-success/15",
    rotuloPadrao: "Alta confiança",
  },
  media: {
    ring: "stroke-warning",
    texto: "text-warning",
    pista: "stroke-warning/15",
    rotuloPadrao: "Confiança média",
  },
  baixa: {
    ring: "stroke-destructive",
    texto: "text-destructive",
    pista: "stroke-destructive/15",
    rotuloPadrao: "Revisão obrigatória",
  },
};

export function BadgeConfianca({
  percentual,
  rotulo,
  tamanho = "md",
  exibirFlag = true,
  className,
}: BadgeConfiancaProps) {
  const nivel = classificar(percentual);
  const t = TAMANHOS[tamanho];
  const c = CLASSES_NIVEL[nivel];
  const valorClampado = Math.max(0, Math.min(100, percentual));
  const raio = 50 - t.stroke;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - valorClampado / 100);

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-2", className)}
      data-slot="badge-confianca"
      data-nivel={nivel}
      role="img"
      aria-label={`Confiança da curadoria: ${valorClampado.toFixed(0)} por cento (${c.rotuloPadrao})`}
    >
      <div className={cn("relative flex items-center justify-center", t.box)}>
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={raio}
            fill="none"
            strokeWidth={t.stroke}
            className={c.pista}
          />
          <circle
            cx="50"
            cy="50"
            r={raio}
            fill="none"
            strokeWidth={t.stroke}
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            className={cn(
              c.ring,
              "transition-[stroke-dashoffset] duration-1000 [transition-timing-function:var(--ease-quart)]"
            )}
          />
        </svg>
        <div className="relative z-10 flex flex-col items-center leading-none">
          <span
            className={cn(
              "font-mono font-semibold tabular-nums",
              c.texto,
              t.numero
            )}
          >
            {valorClampado.toFixed(0)}
          </span>
          <span
            className={cn(
              "mt-0.5 font-mono uppercase tracking-wider text-muted-foreground",
              t.rotulo
            )}
          >
            %
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <span
          className={cn(
            "font-mono uppercase tracking-wider",
            c.texto,
            t.rotulo
          )}
        >
          {rotulo ?? c.rotuloPadrao}
        </span>
        {nivel === "baixa" && exibirFlag && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive-muted px-2 py-0.5",
              "text-destructive",
              t.rotulo
            )}
          >
            <AlertTriangle className="size-3" aria-hidden />
            Revisão necessária
          </span>
        )}
      </div>
    </div>
  );
}
