"use client";

import { useQuery } from "@tanstack/react-query";
import { obter } from "@/lib/api";
import type { Questao, RespostaQuestao, Simulado } from "@/types";

export interface RespostaSimuladoAluno {
  simulado: Simulado;
  questoes: Questao[];
  respostas: RespostaQuestao[];
}

export function useSimuladoAluno(id: string | undefined) {
  return useQuery({
    queryKey: ["aluno", "simulado", id],
    queryFn: () => obter<RespostaSimuladoAluno>(`/aluno/simulado/${id}`),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}
