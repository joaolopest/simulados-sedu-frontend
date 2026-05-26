"use client";

import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BannerFallbackIAProps {
  titulo?: string;
  mensagem?: string;
  rotuloAcao?: string;
  aoAcionar?: () => void;
  className?: string;
}

export function BannerFallbackIA({
  titulo = "Serviço de IA indisponível",
  mensagem = "O simulado será montado por seleção clássica baseada nos parâmetros informados. A curadoria automatizada poderá ser refeita depois.",
  rotuloAcao = "Continuar com seleção clássica",
  aoAcionar,
  className,
}: BannerFallbackIAProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-muted p-4 md:flex-row md:items-start md:gap-4",
        className
      )}
      data-slot="banner-fallback-ia"
    >
      <div
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning"
      >
        <TriangleAlert className="size-5" />
      </div>

      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mensagem}
        </p>
      </div>

      {aoAcionar && (
        <Button
          variant="outline"
          size="sm"
          onClick={aoAcionar}
          className="shrink-0 border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
        >
          {rotuloAcao}
        </Button>
      )}
    </div>
  );
}
