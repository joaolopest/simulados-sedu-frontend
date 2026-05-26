"use client";

import { useCallback, useEffect } from "react";
import type { PreferenciasAcessibilidade } from "@/types";
import { useAcessibilidadeStore } from "@/stores/acessibilidade-store";

const CLASSE_TAMANHO_FONTE: Record<
  PreferenciasAcessibilidade["tamanhoFonte"],
  string
> = {
  padrao: "fonte-padrao",
  grande: "fonte-grande",
  "extra-grande": "fonte-extra-grande",
};

function aplicarPreferencias(prefs: PreferenciasAcessibilidade): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;

  // Tamanho de fonte (classes mutuamente exclusivas).
  Object.values(CLASSE_TAMANHO_FONTE).forEach((classe) => {
    html.classList.remove(classe);
  });
  html.classList.add(CLASSE_TAMANHO_FONTE[prefs.tamanhoFonte]);

  html.classList.toggle("alto-contraste", prefs.altoContraste);
  html.classList.toggle("fonte-dislexia", prefs.fonteDislexia);
  html.classList.toggle("reducao-motion", prefs.reducaoMotion);
}

export function useAcessibilidade(): {
  preferencias: PreferenciasAcessibilidade;
  atualizar: (parcial: Partial<PreferenciasAcessibilidade>) => void;
  resetar: () => void;
} {
  const preferencias = useAcessibilidadeStore((estado) => estado.preferencias);
  const atualizarStore = useAcessibilidadeStore((estado) => estado.atualizar);
  const resetarStore = useAcessibilidadeStore((estado) => estado.resetar);

  useEffect(() => {
    aplicarPreferencias(preferencias);
  }, [preferencias]);

  const atualizar = useCallback(
    (parcial: Partial<PreferenciasAcessibilidade>) => {
      atualizarStore(parcial);
    },
    [atualizarStore],
  );

  const resetar = useCallback(() => {
    resetarStore();
  }, [resetarStore]);

  return { preferencias, atualizar, resetar };
}
