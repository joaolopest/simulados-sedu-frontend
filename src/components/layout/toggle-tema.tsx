"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setTheme(eDark ? "light" : "dark")}
      aria-label={
        montado
          ? eDark
            ? "Mudar para tema claro"
            : "Mudar para tema escuro"
          : "Alternar tema"
      }
    >
      {montado ? (
        eDark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )
      ) : (
        <span className="size-4" aria-hidden />
      )}
    </Button>
  );
}
