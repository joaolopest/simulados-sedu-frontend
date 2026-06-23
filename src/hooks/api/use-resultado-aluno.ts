"use client";

import { useQuery } from "@tanstack/react-query";
import { obter } from "@/lib/api";
import type {
  DiagnosticoSimulado,
  MensagemResultadoIA,
  Questao,
  ResultadoSimulado,
  Simulado,
  SugestaoReforco,
} from "@/types";

export interface RespostaResultadoAluno {
  simulado: Simulado;
  resultado: ResultadoSimulado;
  tentativas?: ResultadoSimulado[];
  questoes: Questao[];
  permissoes?: {
    mostrarResultado?: boolean;
    mostrarGabarito?: boolean;
  };
  diagnostico: DiagnosticoSimulado | null;
  mensagem: MensagemResultadoIA | null;
  sugestoes: SugestaoReforco[];
}

export function useResultadoAluno(simuladoId: string | undefined) {
  return useQuery({
    queryKey: ["aluno", "resultado", simuladoId],
    queryFn: () =>
      obter<RespostaResultadoAluno>(`/aluno/simulado/${simuladoId}/resultado`),
    enabled: Boolean(simuladoId),
    staleTime: 5 * 60_000,
  });
}
