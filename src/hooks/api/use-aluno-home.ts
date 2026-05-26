"use client";

import { useQuery } from "@tanstack/react-query";
import { obter } from "@/lib/api";
import type {
  MensagemResultadoIA,
  ResultadoSimulado,
  Simulado,
} from "@/types";

export interface PontoEvolucao {
  simuladoId: string;
  nota: number;
  data: string;
}

export interface RespostaHomeAluno {
  proximoSimulado: Simulado | null;
  ultimosResultados: ResultadoSimulado[];
  evolucao: PontoEvolucao[];
  mensagemBoasVindas: MensagemResultadoIA | null;
}

export function useAlunoHome() {
  return useQuery({
    queryKey: ["aluno", "home"],
    queryFn: () => obter<RespostaHomeAluno>("/aluno/home"),
    staleTime: 30_000,
  });
}
