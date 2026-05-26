"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Questao } from "@/types";

interface CardQuestaoProps {
  questao: Questao;
  numero: number;
  total: number;
  alternativaSelecionadaId: string | null;
  aoSelecionar: (alternativaId: string) => void;
  className?: string;
}

const LETRAS = ["A", "B", "C", "D", "E"] as const;

export function CardQuestao({
  questao,
  numero,
  total,
  alternativaSelecionadaId,
  aoSelecionar,
  className,
}: CardQuestaoProps) {
  // ordena alternativas por `ordem` pra garantir consistência (não pelo array natural)
  const alternativas = [...questao.alternativas].sort(
    (a, b) => a.ordem - b.ordem,
  );

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card",
        "p-6 md:p-8",
        "shadow-[0_1px_2px_rgba(30,64,175,0.04),inset_0_1px_0_oklch(1_0_0/0.5)]",
        className,
      )}
      data-slot="card-questao"
    >
      <header className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary-text">
          Questão {numero} <span className="text-muted-foreground">de {total}</span>
        </p>
        {questao.adaptacoes.length > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            adaptada
          </span>
        )}
      </header>

      <h2 className="mt-5 text-lg leading-relaxed text-foreground md:text-xl md:leading-relaxed">
        {questao.enunciado}
      </h2>

      {questao.imagemUrl && (
        <figure className="mt-5 overflow-hidden rounded-lg border border-border bg-muted">
          {/* placeholder image — usar next/image quando tiver assets reais */}
          <img
            src={questao.imagemUrl}
            alt={`Imagem da questão ${numero}`}
            className="block h-auto w-full"
            loading="lazy"
          />
        </figure>
      )}

      <fieldset className="mt-6 space-y-2.5">
        <legend className="sr-only">
          Selecione uma das alternativas para a questão {numero}
        </legend>
        {alternativas.map((alt, i) => {
          const selecionada = alt.id === alternativaSelecionadaId;
          const letra = LETRAS[i] ?? String(i + 1);
          return (
            <label
              key={alt.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-4 md:p-5",
                "transition-[background-color,border-color,box-shadow] duration-200",
                "[transition-timing-function:var(--ease-quart)]",
                "hover:bg-accent/50",
                "min-h-[56px]",
                selecionada
                  ? "border-primary bg-primary-muted shadow-[0_0_0_3px_var(--primary-muted)]"
                  : "border-border bg-card",
              )}
              data-selecionada={selecionada}
            >
              <input
                type="radio"
                name={`questao-${questao.id}`}
                value={alt.id}
                checked={selecionada}
                onChange={() => aoSelecionar(alt.id)}
                className="sr-only"
                aria-describedby={`alt-${alt.id}-texto`}
              />
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-sm font-medium",
                  "transition-colors duration-200",
                  selecionada
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground",
                )}
                aria-hidden
              >
                {selecionada ? <Check className="size-3.5" /> : letra}
              </span>
              <span
                id={`alt-${alt.id}-texto`}
                className="flex-1 text-base leading-relaxed text-foreground"
              >
                {alt.texto}
              </span>
            </label>
          );
        })}
      </fieldset>
    </article>
  );
}
