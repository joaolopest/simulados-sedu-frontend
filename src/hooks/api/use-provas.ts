"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { criar, obter } from "@/lib/api";
import type { ParametrosSimulado, Simulado } from "@/types";
import type { TurmaEnriquecida } from "./use-gestor";

export function useProvaTurmas() {
  return useQuery({
    queryKey: ["provas", "turmas"],
    queryFn: async () => {
      const r = await obter<{ dados: TurmaEnriquecida[] }>("/provas/turmas");
      return r.dados;
    },
    staleTime: 60_000,
  });
}

export function useCriarProvaRascunho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parametros: ParametrosSimulado) =>
      criar<Simulado>("/provas", parametros),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provas"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
    },
  });
}

export function useMontarProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { simuladoId: string; questaoIds: string[] }) =>
      criar<{
        id: string;
        status: string;
        totalQuestoes: number;
        questaoIds: string[];
      }>(`/provas/${vars.simuladoId}/montar`, {
        questaoIds: vars.questaoIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provas"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
    },
  });
}

export function useLiberarProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      criar<{ id: string; status: string; liberadoEm: string }>(
        `/provas/${id}/liberar`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provas"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
      qc.invalidateQueries({ queryKey: ["gestor", "dashboard"] });
    },
  });
}
