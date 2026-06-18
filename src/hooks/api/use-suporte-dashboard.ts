"use client";

import { useQuery } from "@tanstack/react-query";
import { obter } from "@/lib/api";
import type {
  ResultadoSimulado,
  SimuladoEmAndamento,
  Usuario,
} from "@/types";

export interface ItemDashboardSuporte {
  aluno: Usuario;
  turmaNome: string;
  ultimoResultado: ResultadoSimulado | null;
  emAndamento: SimuladoEmAndamento | null;
  totalSimulados: number;
}

export interface RespostaDashboardSuporte {
  dados: ItemDashboardSuporte[];
  contagem: {
    total: number;
    respondendoAgora: number;
  };
}

export function useSuporteDashboard() {
  return useQuery({
    queryKey: ["suporte", "dashboard"],
    queryFn: () => obter<RespostaDashboardSuporte>("/suporte/dashboard"),
    refetchInterval: 10_000,
  });
}
