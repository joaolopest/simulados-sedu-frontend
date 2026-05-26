"use client";

import { useQuery } from "@tanstack/react-query";
import { obter } from "@/lib/api";
import type { Materia, ResultadoSimulado } from "@/types";

export interface ResultadoEnriquecido extends ResultadoSimulado {
  simuladoNome: string;
  simuladoMateria: Materia | null;
}

export function useAlunoHistorico() {
  return useQuery({
    queryKey: ["aluno", "historico"],
    queryFn: async () => {
      const resposta = await obter<{ dados: ResultadoEnriquecido[] }>(
        "/aluno/historico",
      );
      return resposta.dados;
    },
    staleTime: 60_000,
  });
}
