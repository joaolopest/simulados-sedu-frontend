"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RespostaQuestao } from "@/types";

interface GridProgressoQuestoesProps {
  totalQuestoes: number;
  questaoAtualIndice: number;
  respostas: Record<string, RespostaQuestao>;
  questaoIds: string[];
  aoNavegar: (indice: number) => void;
  variante?: "rodape" | "grid";
  className?: string;
}

export function GridProgressoQuestoes({
  totalQuestoes,
  questaoAtualIndice,
  respostas,
  questaoIds,
  aoNavegar,
  variante = "rodape",
  className,
}: GridProgressoQuestoesProps) {
  const obterStatus = (indice: number) => {
    const id = questaoIds[indice];
    const resposta = id ? respostas[id] : undefined;
    if (indice === questaoAtualIndice) return "atual";
    if (!resposta) return "nao-iniciada";
    if (resposta.status === "marcada_revisao") return "revisao";
    if (resposta.status === "respondida") return "respondida";
    return "nao-iniciada";
  };

  if (variante === "rodape") {
    // bolinhas pequenas pro rodapé do executar (desktop)
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-1.5",
          className
        )}
        role="navigation"
        aria-label="Navegação entre questões"
        data-slot="grid-progresso-rodape"
      >
        {Array.from({ length: totalQuestoes }, (_, i) => {
          const status = obterStatus(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => aoNavegar(i)}
              aria-label={`Ir para questão ${i + 1}${status === "respondida" ? " (respondida)" : status === "atual" ? " (atual)" : status === "revisao" ? " (marcada para revisão)" : ""}`}
              aria-current={status === "atual" ? "true" : undefined}
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                "transition-[transform,background-color,box-shadow] duration-200",
                "[transition-timing-function:var(--ease-quart)]",
                "hover:scale-125 focus-visible:scale-125",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                status === "atual" &&
                  "size-3 bg-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                status === "respondida" && "bg-success",
                status === "nao-iniciada" && "bg-border",
                status === "revisao" &&
                  "bg-warning ring-1 ring-warning ring-offset-1 ring-offset-background"
              )}
              data-status={status}
            />
          );
        })}
      </div>
    );
  }

  // grid grande (modal mobile ou sidebar desktop)
  return (
    <ol
      className={cn(
        "grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8",
        className
      )}
      role="navigation"
      aria-label="Grid de navegação entre questões"
      data-slot="grid-progresso-grid"
    >
      {Array.from({ length: totalQuestoes }, (_, i) => {
        const status = obterStatus(i);
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => aoNavegar(i)}
              aria-label={`Questão ${i + 1}, ${status === "respondida" ? "respondida" : status === "atual" ? "atual" : status === "revisao" ? "marcada para revisão" : "não iniciada"}`}
              aria-current={status === "atual" ? "true" : undefined}
              className={cn(
                "relative flex aspect-square w-full items-center justify-center rounded-md border",
                "font-mono text-sm font-medium tabular-nums",
                "transition-all duration-200 [transition-timing-function:var(--ease-quart)]",
                "hover:scale-105",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                status === "atual" &&
                  "border-primary bg-primary text-primary-foreground shadow-[0_0_0_3px_var(--primary-muted)]",
                status === "respondida" &&
                  "border-success/40 bg-success-muted text-success",
                status === "nao-iniciada" &&
                  "border-border bg-card text-muted-foreground",
                status === "revisao" &&
                  "border-warning/40 bg-warning-muted text-warning"
              )}
              data-status={status}
            >
              {i + 1}
              {status === "revisao" && (
                <Bookmark
                  className="absolute -top-1 -right-1 size-3 fill-warning text-warning"
                  aria-hidden
                />
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
