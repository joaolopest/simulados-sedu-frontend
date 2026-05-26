import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomEmptyState =
  | "aprendizado"
  | "missao"
  | "autoridade"
  | "ia"
  | "neutro";

const TOM_CLASSES: Record<TomEmptyState, { icone: string; halo: string }> = {
  aprendizado: {
    icone: "text-success",
    halo: "bg-success-muted",
  },
  missao: {
    icone: "text-warning",
    halo: "bg-warning-muted",
  },
  autoridade: {
    icone: "text-primary-text",
    halo: "bg-primary-muted",
  },
  ia: {
    icone: "text-ia-text",
    halo: "bg-ia-muted",
  },
  neutro: {
    icone: "text-muted-foreground",
    halo: "bg-muted",
  },
};

export type VarianteEmptyState = "padrao" | "compacto";

export interface EmptyStateProps {
  icone?: LucideIcon;
  tomIcone?: TomEmptyState;
  titulo: string;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  variante?: VarianteEmptyState;
  className?: string;
}

export function EmptyState({
  icone: Icone,
  tomIcone = "neutro",
  titulo,
  descricao,
  acao,
  variante = "padrao",
  className,
}: EmptyStateProps) {
  const tom = TOM_CLASSES[tomIcone];
  const ehCompacto = variante === "compacto";

  return (
    <div
      data-slot="empty-state"
      data-variante={variante}
      className={cn(
        "motion-materialize flex w-full rounded-xl border border-dashed border-border bg-card",
        ehCompacto
          ? "items-center gap-4 px-4 py-3 text-left"
          : "flex-col items-center gap-4 px-6 py-10 text-center",
        className,
      )}
    >
      {Icone && (
        <div
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            tom.halo,
            ehCompacto ? "size-10" : "size-14",
          )}
        >
          <Icone className={cn(tom.icone, ehCompacto ? "size-5" : "size-7")} />
        </div>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-col",
          ehCompacto ? "gap-0.5" : "gap-2",
        )}
      >
        <h3
          className={cn(
            "font-serif text-foreground",
            ehCompacto ? "text-base" : "text-xl",
          )}
        >
          {titulo}
        </h3>
        {descricao && (
          <p
            className={cn(
              "text-muted-foreground",
              ehCompacto
                ? "text-sm leading-snug"
                : "max-w-prose text-sm leading-relaxed",
            )}
          >
            {descricao}
          </p>
        )}
      </div>

      {acao && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2",
            ehCompacto ? "ml-auto" : "mt-2",
          )}
        >
          {acao}
        </div>
      )}
    </div>
  );
}
