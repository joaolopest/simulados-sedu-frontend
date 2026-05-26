"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PreferenciasAcessibilidade } from "@/types";

const PREFERENCIAS_PADRAO: PreferenciasAcessibilidade = {
  tamanhoFonte: "padrao",
  altoContraste: false,
  fonteDislexia: false,
  reducaoMotion: false,
};

export interface EstadoAcessibilidade {
  preferencias: PreferenciasAcessibilidade;
  atualizar: (parcial: Partial<PreferenciasAcessibilidade>) => void;
  resetar: () => void;
}

export const useAcessibilidadeStore = create<EstadoAcessibilidade>()(
  persist(
    (set, get) => ({
      preferencias: PREFERENCIAS_PADRAO,
      atualizar: (parcial) => {
        set({ preferencias: { ...get().preferencias, ...parcial } });
      },
      resetar: () => set({ preferencias: PREFERENCIAS_PADRAO }),
    }),
    {
      name: "sedu-acessibilidade",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
