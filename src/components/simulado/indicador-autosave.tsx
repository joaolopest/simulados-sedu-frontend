"use client";

import { useEffect, useState } from "react";
import { CloudOff, Loader2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarTempoRelativo } from "@/lib/utils";

export type EstadoAutosave = "ocioso" | "salvando" | "salvo" | "erro";

interface IndicadorAutosaveProps {
  estado: EstadoAutosave;
  ultimoSalvoEm: Date | null;
  online?: boolean;
  pendentes?: number;
  className?: string;
}

export function IndicadorAutosave({
  estado,
  ultimoSalvoEm,
  online = true,
  pendentes = 0,
  className,
}: IndicadorAutosaveProps) {
  const [, forceTick] = useState(0);

  // re-render a cada 10s pra atualizar o "há X segundos"
  useEffect(() => {
    if (!ultimoSalvoEm) return;
    const id = setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [ultimoSalvoEm]);

  if (!online) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-2 rounded-md bg-warning-muted px-2.5 py-1.5 text-xs text-warning",
          className
        )}
        data-slot="indicador-autosave"
        data-estado="offline"
      >
        <CloudOff className="size-3.5 shrink-0" aria-hidden />
        <span className="font-medium">Sem conexão</span>
        {pendentes > 0 && (
          <span className="font-mono tabular-nums">
            · {pendentes} {pendentes === 1 ? "pendente" : "pendentes"}
          </span>
        )}
      </span>
    );
  }

  if (estado === "erro") {
    return (
      <span
        role="status"
        aria-live="assertive"
        className={cn(
          "inline-flex items-center gap-2 rounded-md bg-destructive-muted px-2.5 py-1.5 text-xs text-destructive",
          className
        )}
        data-slot="indicador-autosave"
        data-estado="erro"
      >
        <RefreshCcw className="size-3.5 shrink-0" aria-hidden />
        <span className="font-medium">Falha ao salvar — tentando de novo</span>
      </span>
    );
  }

  if (estado === "salvando") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground",
          className
        )}
        data-slot="indicador-autosave"
        data-estado="salvando"
      >
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        <span>Salvando…</span>
      </span>
    );
  }

  if (estado === "salvo" && ultimoSalvoEm) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-2 rounded-md bg-success-muted px-2.5 py-1.5 text-xs text-success",
          className
        )}
        data-slot="indicador-autosave"
        data-estado="salvo"
      >
        {/* checkmark stroke draw — keyframe draw-check */}
        <svg
          viewBox="0 0 24 24"
          className="size-3.5 shrink-0"
          aria-hidden
        >
          <path
            d="M5 12.5l4 4L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="24"
            strokeDashoffset="24"
            style={{
              animation: "draw-check 0.3s var(--ease-quart) forwards",
            }}
          />
        </svg>
        <span>Salvo {formatarTempoRelativo(ultimoSalvoEm)}</span>
      </span>
    );
  }

  return null;
}
