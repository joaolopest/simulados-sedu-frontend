"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeIAProps {
  rotulo?: string;
  descricao?: string;
  variante?: "padrao" | "compacto" | "pulsante";
  className?: string;
  tamanho?: "sm" | "md" | "lg";
}

const TAMANHOS = {
  sm: { padding: "px-1.5 py-0.5", texto: "text-[10px]", icone: "size-3" },
  md: { padding: "px-2 py-1", texto: "text-xs", icone: "size-3.5" },
  lg: { padding: "px-3 py-1.5", texto: "text-sm", icone: "size-4" },
} as const;

export function BadgeIA({
  rotulo = "IA",
  descricao = "Conteúdo gerado por inteligência artificial. Pode requerer revisão.",
  variante = "padrao",
  className,
  tamanho = "md",
}: BadgeIAProps) {
  const t = TAMANHOS[tamanho];

  const conteudo = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wider",
        "bg-ia-muted text-ia-text",
        "shadow-[inset_0_0_0_1px_var(--ia-muted),inset_0_1px_0_oklch(1_0_0/0.05),0_1px_0_oklch(0.456_0.247_296/0.06)]",
        "transition-colors duration-200",
        t.padding,
        t.texto,
        variante === "pulsante" && "motion-pulse-ambient",
        className
      )}
      data-slot="badge-ia"
      aria-label="Conteúdo gerado por IA"
    >
      <Sparkles className={cn(t.icone, "shrink-0")} aria-hidden />
      {variante !== "compacto" && (
        <span className="font-semibold">{rotulo}</span>
      )}
    </span>
  );

  if (!descricao) return conteudo;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{conteudo}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {descricao}
      </TooltipContent>
    </Tooltip>
  );
}
