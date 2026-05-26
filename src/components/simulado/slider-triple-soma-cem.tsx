"use client";

import { useCallback } from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import type { DistribuicaoDificuldade } from "@/types";

interface SliderTripleSomaCemProps {
  valor: DistribuicaoDificuldade;
  aoMudar: (proximo: DistribuicaoDificuldade) => void;
  className?: string;
}

interface ConfigBarra {
  chave: keyof DistribuicaoDificuldade;
  rotulo: string;
  cor: string;
  corClara: string;
}

// 3 tons do MESMO hue verde (estilo judit) — claro → médio → escuro
const CONFIGS: ConfigBarra[] = [
  {
    chave: "facil",
    rotulo: "Fácil",
    cor: "oklch(0.72 0.14 161)",
    corClara: "oklch(0.92 0.06 161 / 0.4)",
  },
  {
    chave: "medio",
    rotulo: "Médio",
    cor: "oklch(0.55 0.12 161)",
    corClara: "oklch(0.92 0.06 161 / 0.4)",
  },
  {
    chave: "dificil",
    rotulo: "Difícil",
    cor: "oklch(0.38 0.10 161)",
    corClara: "oklch(0.92 0.06 161 / 0.4)",
  },
];

export function SliderTripleSomaCem({
  valor,
  aoMudar,
  className,
}: SliderTripleSomaCemProps) {
  /**
   * Quando 1 slider muda, distribui o delta proporcionalmente entre os outros 2.
   * Mantém soma = 100 sempre.
   */
  const ajustar = useCallback(
    (chave: keyof DistribuicaoDificuldade, novoValor: number) => {
      const v = Math.max(0, Math.min(100, Math.round(novoValor)));
      const delta = v - valor[chave];
      if (delta === 0) return;

      const outras = (
        ["facil", "medio", "dificil"] as (keyof DistribuicaoDificuldade)[]
      ).filter((c) => c !== chave);

      // soma das outras antes do ajuste
      const somaOutras = outras.reduce((s, c) => s + valor[c], 0);

      // novo valor das outras (precisam absorver o delta)
      const novaSomaOutras = somaOutras - delta;

      let proximo: DistribuicaoDificuldade;

      if (somaOutras === 0) {
        // edge case: as outras estão zeradas — distribui igualmente o que sobra
        const sobra = 100 - v;
        proximo = {
          ...valor,
          [chave]: v,
          [outras[0]]: Math.floor(sobra / 2),
          [outras[1]]: Math.ceil(sobra / 2),
        } as DistribuicaoDificuldade;
      } else if (novaSomaOutras < 0) {
        // delta maior que a soma das outras — zera ambas e ajusta o atual
        proximo = {
          ...valor,
          [chave]: 100,
          [outras[0]]: 0,
          [outras[1]]: 0,
        } as DistribuicaoDificuldade;
      } else {
        // distribuição proporcional
        const r0 = valor[outras[0]] / somaOutras;
        const novo0 = Math.max(0, Math.round(novaSomaOutras * r0));
        const novo1 = Math.max(0, 100 - v - novo0);
        proximo = {
          ...valor,
          [chave]: v,
          [outras[0]]: novo0,
          [outras[1]]: novo1,
        } as DistribuicaoDificuldade;
      }

      aoMudar(proximo);
    },
    [valor, aoMudar],
  );

  const total = valor.facil + valor.medio + valor.dificil;

  return (
    <div className={cn("space-y-5", className)} data-slot="slider-triple-soma-cem">
      {/* barra horizontal segmentada */}
      <div className="flex h-12 w-full overflow-hidden rounded-lg border border-border">
        {CONFIGS.map((c) => {
          const pct = valor[c.chave];
          return (
            <div
              key={c.chave}
              className="relative flex shrink-0 items-center justify-center transition-[width,background-color] duration-200 [transition-timing-function:var(--ease-quart)]"
              style={{
                width: `${pct}%`,
                backgroundColor: c.cor,
                minWidth: pct > 0 ? "12px" : "0",
              }}
              aria-hidden
            >
              {pct >= 12 && (
                <span className="font-mono text-[11px] font-semibold tabular-nums text-white">
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* sliders individuais */}
      <div className="space-y-4">
        {CONFIGS.map((c) => (
          <SliderItem
            key={c.chave}
            config={c}
            valor={valor[c.chave]}
            aoMudar={(v) => ajustar(c.chave, v)}
          />
        ))}
      </div>

      {/* totalizador */}
      <div
        className={cn(
          "flex items-center justify-between rounded-md border px-3 py-2 font-mono text-xs",
          total === 100
            ? "border-success/40 bg-success-muted text-success"
            : "border-warning/40 bg-warning-muted text-warning",
        )}
        aria-live="polite"
      >
        <span className="uppercase tracking-wider">Total</span>
        <span className="font-semibold tabular-nums">
          {total}% {total === 100 ? "✓" : `(faltam ${100 - total}%)`}
        </span>
      </div>
    </div>
  );
}

function SliderItem({
  config,
  valor,
  aoMudar,
}: {
  config: ConfigBarra;
  valor: number;
  aoMudar: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor={`slider-${config.chave}`}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <span
            className="size-3 rounded-sm"
            style={{ backgroundColor: config.cor }}
            aria-hidden
          />
          {config.rotulo}
        </label>
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {valor}%
        </span>
      </div>

      <SliderPrimitive.Root
        id={`slider-${config.chave}`}
        value={[valor]}
        max={100}
        step={5}
        onValueChange={(v) => aoMudar(v[0] ?? 0)}
        className="relative flex h-5 w-full touch-none items-center select-none"
        aria-label={`Porcentagem de questões ${config.rotulo.toLowerCase()}`}
      >
        <SliderPrimitive.Track
          className="relative h-2 w-full grow overflow-hidden rounded-full"
          style={{ backgroundColor: config.corClara }}
        >
          <SliderPrimitive.Range
            className="absolute h-full"
            style={{ backgroundColor: config.cor }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block size-5 rounded-full border-2 bg-background shadow-sm transition-transform duration-150 [transition-timing-function:var(--ease-snap)] focus-visible:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-105"
          style={{ borderColor: config.cor }}
        />
      </SliderPrimitive.Root>
    </div>
  );
}
