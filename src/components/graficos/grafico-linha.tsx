"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { cn } from "@/lib/utils";

export type TomCategoria =
  | "aprendizado"
  | "missao"
  | "autoridade"
  | "ia"
  | "neutro";

const STROKE_POR_TOM: Record<TomCategoria, string> = {
  aprendizado: "var(--color-categoria-aprendizado)",
  missao: "var(--color-categoria-missao)",
  autoridade: "var(--color-categoria-autoridade)",
  ia: "var(--ia)",
  neutro: "var(--muted-foreground)",
};

export interface LinhaConfig {
  chave: string;
  rotulo?: string;
  tom?: TomCategoria;
  tracejada?: boolean;
}

export interface GraficoLinhaProps {
  dados: ReadonlyArray<Record<string, unknown>>;
  chaveX: string;
  linhas: ReadonlyArray<LinhaConfig>;
  altura?: number;
  dominioY?: [number, number] | "auto";
  mostrarTooltip?: boolean;
  mostrarGrid?: boolean;
  delayReveal?: number;
  duracaoDraw?: number;
  formatadorValor?: (valor: number) => string;
  formatadorRotuloX?: (valor: unknown) => string;
  ariaLabel?: string;
  className?: string;
}

export function GraficoLinha({
  dados,
  chaveX,
  linhas,
  altura = 240,
  dominioY = "auto",
  mostrarTooltip = true,
  mostrarGrid = true,
  delayReveal = 0,
  duracaoDraw = 1500,
  formatadorValor,
  formatadorRotuloX,
  ariaLabel,
  className,
}: GraficoLinhaProps) {
  const reducaoMotion = useReducedMotion();
  const idBase = useId();

  const animacaoAtiva = !reducaoMotion;
  const duracao = animacaoAtiva ? duracaoDraw : 0;

  const renderizarTooltip = useMemo(
    () => criarRenderizadorTooltip(linhas, formatadorValor),
    [linhas, formatadorValor],
  );

  return (
    <motion.div
      className={cn("w-full", className)}
      style={{ height: altura }}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: delayReveal,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={dados as Array<Record<string, unknown>>}
          margin={{ top: 8, right: 8, bottom: 4, left: 4 }}
        >
          {mostrarGrid && (
            <CartesianGrid
              stroke="oklch(0.18 0.024 263 / 0.06)"
              strokeDasharray="2 4"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={chaveX}
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 10,
              fontFamily: "var(--fonte-mono)",
              fill: "var(--muted-foreground)",
            }}
            stroke="var(--muted-foreground)"
            tickFormatter={formatadorRotuloX}
          />
          <YAxis
            domain={dominioY === "auto" ? ["auto", "auto"] : dominioY}
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 10,
              fontFamily: "var(--fonte-mono)",
              fill: "var(--muted-foreground)",
            }}
            stroke="var(--muted-foreground)"
            width={28}
            tickFormatter={
              formatadorValor
                ? (v) => formatadorValor(Number(v))
                : undefined
            }
          />
          {mostrarTooltip && (
            <Tooltip
              cursor={{
                stroke: "var(--muted-foreground)",
                strokeDasharray: "3 3",
                strokeOpacity: 0.4,
              }}
              content={renderizarTooltip}
            />
          )}
          {linhas.map((linha, indice) => {
            const cor = STROKE_POR_TOM[linha.tom ?? "autoridade"];
            return (
              <Line
                key={`${idBase}-${linha.chave}`}
                type="monotone"
                dataKey={linha.chave}
                name={linha.rotulo ?? linha.chave}
                stroke={cor}
                strokeWidth={2.5}
                strokeDasharray={linha.tracejada ? "6 4" : undefined}
                dot={{
                  r: 3.5,
                  fill: cor,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5.5,
                  fill: cor,
                  stroke: "var(--card)",
                  strokeWidth: 3,
                }}
                isAnimationActive={animacaoAtiva}
                animationBegin={delayReveal * 1000 + indice * 120}
                animationDuration={duracao}
                animationEasing="ease-out"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

function criarRenderizadorTooltip(
  linhas: ReadonlyArray<LinhaConfig>,
  formatadorValor?: (valor: number) => string,
) {
  return function RenderizadorTooltip(props: TooltipContentProps) {
    const { active, payload, label } = props;

    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div
        className={cn(
          "rounded-md border bg-card px-3 py-2",
          "shadow-[0_1px_3px_oklch(0.18_0.024_263_/_0.04),0_4px_12px_oklch(0.18_0.024_263_/_0.04)]",
          "font-mono text-[11px] tabular-nums",
        )}
      >
        {label !== undefined && (
          <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {String(label)}
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {payload.map((item) => {
            const config = linhas.find((l) => l.chave === item.dataKey);
            const cor = STROKE_POR_TOM[config?.tom ?? "autoridade"];
            const valorNumerico =
              typeof item.value === "number"
                ? item.value
                : Number(item.value);
            const formatado = Number.isFinite(valorNumerico)
              ? formatadorValor
                ? formatadorValor(valorNumerico)
                : valorNumerico.toLocaleString("pt-BR")
              : String(item.value ?? "");

            return (
              <li
                key={String(item.dataKey)}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-1.5 text-foreground">
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-full"
                    style={{ background: cor }}
                  />
                  {config?.rotulo ?? String(item.name ?? item.dataKey)}
                </span>
                <span className="text-foreground">{formatado}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };
}
