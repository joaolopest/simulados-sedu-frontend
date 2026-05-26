"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeIA } from "./badge-ia";

interface BannerInsightIAProps {
  titulo: string;
  bullets: string[];
  geradoEm?: string;
  modeloUsado?: string;
  className?: string;
}

export function BannerInsightIA({
  titulo,
  bullets,
  geradoEm,
  modeloUsado,
  className,
}: BannerInsightIAProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl",
        "border border-ia/20 bg-ia-muted",
        "shadow-[0_1px_2px_rgba(109,40,217,0.06),inset_0_1px_0_oklch(1_0_0/0.5)]",
        "dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.06),0_8px_24px_rgba(0,0,0,0.3)]",
        "p-6 md:p-8",
        className
      )}
      data-slot="banner-insight-ia"
    >
      {/* chroma-sweep ambient — gradient violeta diagonal sutil que entra ao montar */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-30",
          "bg-[linear-gradient(115deg,transparent_30%,oklch(0.602_0.198_295/0.18)_50%,transparent_70%)]",
          "bg-[length:300%_100%]",
          "[animation:chroma-sweep_1.2s_var(--ease-quart)_both]"
        )}
      />

      <header className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              "bg-ia/12 text-ia-text",
              "shadow-[inset_0_1px_0_oklch(1_0_0/0.1)]"
            )}
            aria-hidden
          >
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-foreground md:text-2xl">
              {titulo}
            </h3>
            <BadgeIA tamanho="sm" className="mt-1" />
          </div>
        </div>
      </header>

      <ul className="relative mt-5 space-y-2.5">
        {bullets.map((bullet, i) => (
          <li
            key={i}
            className="flex gap-3 text-sm leading-relaxed text-foreground/85 md:text-base"
          >
            <span
              aria-hidden
              className="mt-2 size-1.5 shrink-0 rounded-full bg-ia"
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {(geradoEm || modeloUsado) && (
        <footer className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {modeloUsado && <span>{modeloUsado}</span>}
          {modeloUsado && geradoEm && <span aria-hidden>·</span>}
          {geradoEm && <time dateTime={geradoEm}>{geradoEm}</time>}
        </footer>
      )}
    </article>
  );
}
