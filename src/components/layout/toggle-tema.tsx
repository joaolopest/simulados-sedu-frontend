"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

function useMontado(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ToggleTema() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const montado = useMontado();

  const eDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-9 w-16 items-center rounded-full border border-border bg-muted p-1 text-muted-foreground shadow-xs transition-[background-color,border-color,box-shadow] duration-300",
        "hover:border-primary/25 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        eDark && "border-primary/20 bg-primary-muted text-primary-text",
      )}
      onClick={() => setTheme(eDark ? "light" : "dark")}
      aria-pressed={montado ? eDark : undefined}
      aria-label={
        montado
          ? eDark
            ? "Mudar para tema claro"
            : "Mudar para tema escuro"
          : "Alternar tema"
      }
    >
      <span
        className={cn(
          "absolute left-1 top-1 flex size-7 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform duration-300 [transition-timing-function:var(--ease-quart)]",
          eDark && "translate-x-7",
        )}
        aria-hidden
      >
        {montado ? (
          eDark ? (
            <Moon className="size-3.5" />
          ) : (
            <Sun className="size-3.5" />
          )
        ) : null}
      </span>
      <Sun className="ml-1 size-3.5 opacity-65" aria-hidden />
      <Moon className="ml-auto mr-1 size-3.5 opacity-65" aria-hidden />
    </button>
  );
}
