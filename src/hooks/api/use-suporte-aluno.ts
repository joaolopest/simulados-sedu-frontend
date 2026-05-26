"use client";

import { useQuery } from "@tanstack/react-query";
import { obter } from "@/lib/api";
import type {
  Escola,
  Questao,
  RespostaQuestao,
  ResultadoSimulado,
  Simulado,
  SimuladoEmAndamento,
  Turma,
  Usuario,
} from "@/types";

export interface RespostaSuporteAluno {
  aluno: Usuario;
  turma: Turma | null;
  escola: Escola | null;
  simuladoAtivo: Simulado | null;
  questoesAtivas: Questao[];
  emAndamento: SimuladoEmAndamento | null;
  ultimosResultados: ResultadoSimulado[];
}

export interface RespostaEspelhamento {
  ativo: boolean;
  questaoAtualIndice: number;
  respostas: Record<string, RespostaQuestao>;
  tempoRestanteSegundos: number;
  ultimaAtividadeEm: string | null;
  conexaoOk: boolean;
}

export function useSuporteAluno(id: string | undefined) {
  return useQuery({
    queryKey: ["suporte", "aluno", id],
    queryFn: () => obter<RespostaSuporteAluno>(`/suporte/aluno/${id}`),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/**
 * Polling 2s pra simular espelhamento ao vivo.
 * Quando o aluno não tem simulado ativo, ainda retorna {ativo: false}.
 */
export function useEspelhamentoAluno(
  id: string | undefined,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ["suporte", "espelhamento", id],
    queryFn: () =>
      obter<RespostaEspelhamento>(`/suporte/aluno/${id}/espelhamento`),
    enabled: Boolean(id) && habilitado,
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}
