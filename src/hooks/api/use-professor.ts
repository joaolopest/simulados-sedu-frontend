"use client";

import { useQuery } from "@tanstack/react-query";
import { obter } from "@/lib/api";
import type { Questao, Simulado } from "@/types";

export interface RespostaDashboardProfessor {
  kpis: {
    minhasQuestoes: number;
    provasCriadas: number;
    provasLiberadas: number;
    revisoesPendentes: number;
    alertasQualidade: number;
  };
  qualidadeQuestoes: {
    totalQuestoes: number;
    publicadas: number;
    rascunhos: number;
    emRevisao: number;
    arquivadas: number;
    comAlertas: number;
    semRespostas: number;
    taxaMediaAcerto: number;
  };
  provasRecentes: (Simulado & {
    totalQuestoes: number;
    totalAlunos: number;
  })[];
  questoesRecentes: Questao[];
  insights: {
    id?: string;
    tipo?: string;
    titulo?: string;
    texto?: string;
    criadoEm?: string;
  }[];
}

export function useProfessorDashboard() {
  return useQuery({
    queryKey: ["professor", "dashboard"],
    queryFn: () => obter<RespostaDashboardProfessor>("/professor/dashboard"),
    staleTime: 30_000,
  });
}
