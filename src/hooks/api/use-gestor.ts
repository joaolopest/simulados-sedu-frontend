"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atualizar, criar, obter, remover } from "@/lib/api";
import type {
  AdaptacaoCognitiva,
  CuradoriaIA,
  DiagnosticoSimulado,
  ParametrosSimulado,
  Questao,
  Simulado,
  StatusAlunoSimulado,
  Turma,
  Usuario,
} from "@/types";

// ============================================================
// Dashboard
// ============================================================

export interface RespostaDashboardGestor {
  kpis: {
    totalAlunos: number;
    totalEscolas: number;
    totalTurmas: number;
    simuladosEmAndamento: number;
    mediaGeral: number;
    alertasIA: number;
  };
  meusSimulados: (Simulado & { totalAlunos: number })[];
  alunosEmRisco: AlunoEmRiscoResumo[];
  mediasPorTurma: { turmaId: string; turmaNome: string; media: number }[];
  tendenciaSemanal: { semana: string; media: number; simulados: number }[];
  insights: unknown[];
}

export interface AlunoEmRiscoResumo {
  aluno: Usuario;
  probabilidadeRisco: number;
  tendencia: "subindo" | "estavel" | "caindo";
  ultimaAtualizacao: string;
}

export function useGestorDashboard() {
  return useQuery({
    queryKey: ["gestor", "dashboard"],
    queryFn: () => obter<RespostaDashboardGestor>("/gestor/dashboard"),
    staleTime: 30_000,
  });
}

// ============================================================
// Simulados (lista)
// ============================================================

export function useGestorSimulados(filtros?: {
  status?: string;
  busca?: string;
}) {
  const params = new URLSearchParams();
  if (filtros?.status) params.set("status", filtros.status);
  if (filtros?.busca) params.set("busca", filtros.busca);
  const qs = params.toString();

  return useQuery({
    queryKey: ["gestor", "simulados", filtros],
    queryFn: async () => {
      const r = await obter<{ dados: Simulado[] }>(
        `/gestor/simulados${qs ? `?${qs}` : ""}`,
      );
      return r.dados;
    },
    staleTime: 15_000,
  });
}

export function useGestorSimulado(id: string | undefined) {
  return useQuery({
    queryKey: ["gestor", "simulado", id],
    queryFn: () =>
      obter<{ simulado: Simulado; questoes: Questao[] }>(
        `/gestor/simulados/${id}`,
      ),
    enabled: Boolean(id),
  });
}

// ============================================================
// Curadoria IA
// ============================================================

export interface RespostaCuradoria {
  curadoria: CuradoriaIA;
  questoesSelecionadas: Questao[];
  questaoIds: string[];
}

export function useCurarSimulado() {
  return useMutation({
    mutationFn: async (vars: {
      simuladoId: string;
      parametros: ParametrosSimulado;
    }) => {
      return criar<RespostaCuradoria>(
        `/gestor/simulados/${vars.simuladoId}/curar`,
        { parametros: vars.parametros },
      );
    },
  });
}

export function useCriarSimuladoRascunho() {
  return useMutation({
    mutationFn: (parametros: ParametrosSimulado) =>
      criar<Simulado>("/gestor/simulados", parametros),
  });
}

export function useAtualizarSimulado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; parametros: ParametrosSimulado }) =>
      atualizar<Simulado>(`/gestor/simulados/${vars.id}`, {
        parametros: vars.parametros,
      }),
    onSuccess: (simulado) => {
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
      qc.invalidateQueries({ queryKey: ["gestor", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulado", simulado.id] });
    },
  });
}

export function useRemoverSimulado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; forcar?: boolean }) =>
      remover<{ id: string; removido: boolean; cancelado: boolean }>(
        `/gestor/simulados/${vars.id}${vars.forcar ? "?forcar=true" : ""}`,
      ),
    onSuccess: (_resultado, vars) => {
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
      qc.invalidateQueries({ queryKey: ["gestor", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["gestor", "simulado", vars.id] });
    },
  });
}

export function useLiberarSimulado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      criar<{ id: string; status: string; liberadoEm: string }>(
        `/gestor/simulados/${id}/liberar`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
      qc.invalidateQueries({ queryKey: ["gestor", "dashboard"] });
    },
  });
}

// Construtor manual: define a lista exata de questões da prova (por id).
export function useMontarProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { simuladoId: string; questaoIds: string[] }) =>
      criar<{
        id: string;
        status: string;
        totalQuestoes: number;
        questaoIds: string[];
      }>(`/gestor/simulados/${vars.simuladoId}/montar`, {
        questaoIds: vars.questaoIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gestor", "simulados"] });
    },
  });
}

// ============================================================
// Acompanhamento ao vivo
// ============================================================

export interface AlunoAcompanhamento {
  alunoId: string;
  nome: string;
  fotoUrl?: string;
  status: StatusAlunoSimulado;
  questaoAtualIndice: number;
  totalQuestoes: number;
  tempoRestanteSegundos: number;
  conexaoOk: boolean;
  ultimaAtividadeEm: string;
}

export interface RespostaAcompanhamento {
  simulado: Simulado;
  alunos: AlunoAcompanhamento[];
  contagens: {
    nao_iniciou: number;
    em_andamento: number;
    finalizado: number;
    desconectou: number;
    total: number;
  };
  tempoLimiteMinutos: number;
}

export function useAcompanharSimulado(id: string | undefined) {
  return useQuery({
    queryKey: ["gestor", "acompanhar", id],
    queryFn: () =>
      obter<RespostaAcompanhamento>(`/gestor/simulados/${id}/acompanhar`),
    enabled: Boolean(id),
    refetchInterval: 5000,
    staleTime: 0,
  });
}

// ============================================================
// Relatório
// ============================================================

export interface RespostaRelatorio {
  simulado: Simulado;
  panorama: {
    media: number;
    maior: number;
    menor: number;
    taxaConclusao: number;
    totalRespostas: number;
  };
  diagnostico: DiagnosticoSimulado;
  competencias: {
    competencia: string;
    taxaAcerto: number;
    mediaEstadual: number;
    totalQuestoes: number;
    acertos: number;
  }[];
  tabela: {
    alunoId: string;
    alunoNome: string;
    fotoUrl?: string;
    adaptacoes: AdaptacaoCognitiva[];
    notaFinal: number;
    acertos: number;
    erros: number;
    emBranco: number;
    tempoTotalSegundos: number;
    emRisco: boolean;
  }[];
  sugestoes: unknown[];
}

export function useRelatorioSimulado(id: string | undefined) {
  return useQuery({
    queryKey: ["gestor", "relatorio", id],
    queryFn: () => obter<RespostaRelatorio>(`/gestor/simulados/${id}/relatorio`),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

// ============================================================
// Turmas
// ============================================================

export interface TurmaEnriquecida extends Turma {
  escolaNome: string;
  totalAlunos: number;
  totalComAdaptacao: number;
  totalSimulados: number;
  simuladosLiberados: number;
  simuladosFinalizados: number;
  alunos?: {
    id: string;
    usuarioId: string;
    nome: string;
    email: string;
    necessitaSuporte: boolean;
  }[];
}

export interface AlunoTurmaDetalhe {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
  fotoUrl?: string | null;
  necessitaSuporte: boolean;
  adaptacoes: AdaptacaoCognitiva[];
  media: number | null;
  probabilidadeRisco: number;
  totalResultados: number;
  ultimoResultado?: {
    simuladoId: string;
    notaFinal: number;
    acertos: number;
    erros: number;
    emBranco: number;
    finalizadoEm?: string | null;
  } | null;
  competenciasFracas: string[];
}

export interface SimuladoTurmaDetalhe extends Simulado {
  media: number | null;
  totalQuestoes: number;
  totalAlunos: number;
  contagens: {
    nao_iniciou: number;
    em_andamento: number;
    finalizado: number;
    desconectou: number;
    total: number;
  };
}

export interface DetalheTurmaGestor {
  turma: TurmaEnriquecida;
  kpis: {
    totalAlunos: number;
    totalComAdaptacao: number;
    totalSimulados: number;
    simuladosFinalizados: number;
    mediaTurma: number | null;
    alunosEmRisco: number;
  };
  alunos: AlunoTurmaDetalhe[];
  simulados: SimuladoTurmaDetalhe[];
  resultadosRecentes: {
    alunoId: string;
    alunoNome: string;
    simuladoId: string;
    notaFinal: number;
    acertos: number;
    erros: number;
    emBranco: number;
    finalizadoEm?: string | null;
  }[];
  alertas: {
    tipo: string;
    severidade: "baixa" | "media" | "alta";
    titulo: string;
    mensagem: string;
    quantidade: number;
  }[];
}

export function useGestorTurmas() {
  return useQuery({
    queryKey: ["gestor", "turmas"],
    queryFn: async () => {
      const r = await obter<{ dados: TurmaEnriquecida[] }>("/gestor/turmas");
      return r.dados;
    },
    staleTime: 60_000,
  });
}

export function useGestorTurmaDetalhe(id: string | undefined) {
  return useQuery({
    queryKey: ["gestor", "turma", id],
    queryFn: () => obter<DetalheTurmaGestor>(`/gestor/turmas/${id}`),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
}

// ============================================================
// Alertas IA
// ============================================================

export interface AlertaRisco {
  aluno: Usuario;
  turmaNome: string;
  probabilidadeRisco: number;
  tendencia: "subindo" | "estavel" | "caindo";
  ultimaAtualizacao: string;
  ultimaNota: number;
  competenciasFracas: string[];
  historicoNotas?: { rodada: number; nota: number }[];
}

export interface RespostaAlertas {
  dados: AlertaRisco[];
  contagens: {
    alta: number;
    media: number;
    baixa: number;
    total: number;
  };
}

export function useGestorAlertas() {
  return useQuery({
    queryKey: ["gestor", "alertas"],
    queryFn: () => obter<RespostaAlertas>("/gestor/alertas"),
    staleTime: 30_000,
  });
}
