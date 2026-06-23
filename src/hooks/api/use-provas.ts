"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { criar, obter } from "@/lib/api";
import type {
  Materia,
  NivelDificuldade,
  ParametrosSimulado,
  Questao,
  SerieEscolar,
  Simulado,
} from "@/types";
import type { TurmaEnriquecida } from "./use-gestor";

export interface ParametrosGeracaoProva {
  nome: string;
  turmaId: string;
  serie?: SerieEscolar;
  materias?: Materia[];
  conteudos?: string[];
  niveis?: NivelDificuldade[];
  quantidade?: number;
  quantidadeQuestoes?: number;
  tempoLimiteMinutos?: number;
  evitarQuestoesJaUsadas?: boolean;
  comImagem?: boolean;
}

export interface RespostaGeracaoProva {
  simulado: Simulado;
  questoesSelecionadas: Questao[];
  questaoIds: string[];
  avisos: string[];
}

export interface RespostaSugestaoQuestoesProva {
  questoesSelecionadas: Questao[];
  questaoIds: string[];
  avisos: string[];
}

export interface ValidacaoProva {
  ok: boolean;
  erros: string[];
  avisos: string[];
  totalQuestoes: number;
}

export interface PreviewProva {
  simulado: Simulado;
  questoes: Questao[];
  snapshotId?: string;
}

export interface TemplateProva {
  id: string;
  nome: string;
  descricao?: string | null;
  escolaId?: string | null;
  parametros: ParametrosGeracaoProva;
  criadoPor: string;
  criadoEm?: string | null;
}

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

export function useGerarProvaAutomatica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parametros: ParametrosGeracaoProva) =>
      criar<RespostaGeracaoProva>("/provas/gerar-automaticamente", parametros),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provas"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
      qc.invalidateQueries({ queryKey: ["gestor", "dashboard"] });
    },
  });
}

export function useSugerirQuestoesProva() {
  return useMutation({
    mutationFn: (parametros: ParametrosGeracaoProva) =>
      criar<RespostaSugestaoQuestoesProva>(
        "/provas/questoes-sugeridas",
        parametros,
      ),
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

export function useValidarProva(id: string | undefined) {
  return useQuery({
    queryKey: ["provas", id, "validacao"],
    queryFn: () => obter<ValidacaoProva>(`/provas/${id}/validar`),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function usePreviewProva(id: string | undefined) {
  return useQuery({
    queryKey: ["provas", id, "preview"],
    queryFn: () => obter<PreviewProva>(`/provas/${id}/preview`),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useProvaTemplates() {
  return useQuery({
    queryKey: ["provas", "templates"],
    queryFn: async () => {
      const r = await obter<{ dados: TemplateProva[] }>("/provas/templates");
      return r.dados;
    },
    staleTime: 60_000,
  });
}

export function useCriarProvaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: {
      nome: string;
      descricao?: string;
      parametros: ParametrosGeracaoProva;
    }) => criar<TemplateProva>("/provas/templates", dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provas", "templates"] });
    },
  });
}

export function useGerarProvaPorTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { templateId: string; parametros?: Partial<ParametrosGeracaoProva> }) =>
      criar<RespostaGeracaoProva>(
        `/provas/templates/${vars.templateId}/gerar`,
        vars.parametros ?? {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provas"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
    },
  });
}

export function useReabrirTentativaProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { simuladoId: string; alunoId: string; motivo: string }) =>
      criar<{ ok: boolean; tentativaId: string }>(
        `/provas/${vars.simuladoId}/alunos/${vars.alunoId}/reabrir`,
        { motivo: vars.motivo },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulado", vars.simuladoId] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulado", vars.simuladoId, "acompanhar"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulado", vars.simuladoId, "relatorio"] });
    },
  });
}
