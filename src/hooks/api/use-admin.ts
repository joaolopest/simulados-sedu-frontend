"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atualizar, criar, obter, remover } from "@/lib/api";
import type {
  AcaoAuditoria,
  AdaptacaoCognitiva,
  Escola,
  Materia,
  NivelDificuldade,
  PerfilUsuario,
  Questao,
  ResultadoImportacao,
  SerieEscolar,
  StatusQuestao,
  Usuario,
} from "@/types";

// ============================================================
// Dashboard
// ============================================================

export interface RespostaDashboardAdmin {
  kpis: {
    totalQuestoes: number;
    totalEscolas: number;
    simuladosNoMes: number;
    alunosEmRisco: number;
    deltaQuestoes: number;
    deltaEscolas: number;
    deltaSimulados: number;
    deltaRisco: number;
  };
  tendenciaSemanal: {
    semana: string;
    questoes: number;
    simulados: number;
    importacoes: number;
  }[];
  topEscolas: {
    escola: Escola;
    simuladosAplicados: number;
    totalAlunos: number;
    taxaParticipacao: number;
  }[];
  insights: unknown[];
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => obter<RespostaDashboardAdmin>("/admin/dashboard"),
    staleTime: 30_000,
  });
}

// ============================================================
// Questões
// ============================================================

export interface FiltrosQuestao {
  busca?: string;
  serie?: SerieEscolar[];
  materia?: Materia[];
  nivel?: NivelDificuldade[];
  status?: StatusQuestao[];
  adaptacao?: AdaptacaoCognitiva[];
  pagina?: number;
  porPagina?: number;
}

export interface RespostaQuestoesPaginada {
  dados: Questao[];
  meta: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
  };
}

export function useAdminQuestoes(filtros?: FiltrosQuestao) {
  const params = new URLSearchParams();
  if (filtros?.busca) params.set("busca", filtros.busca);
  filtros?.serie?.forEach((s) => params.append("serie", s));
  filtros?.materia?.forEach((m) => params.append("materia", m));
  filtros?.nivel?.forEach((n) => params.append("nivel", n));
  filtros?.status?.forEach((s) => params.append("status", s));
  filtros?.adaptacao?.forEach((a) => params.append("adaptacao", a));
  if (filtros?.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros?.porPagina) params.set("porPagina", String(filtros.porPagina));
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "questoes", filtros],
    queryFn: () =>
      obter<RespostaQuestoesPaginada>(`/admin/questoes${qs ? `?${qs}` : ""}`),
    staleTime: 15_000,
  });
}

export function useAdminQuestao(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "questao", id],
    queryFn: () => obter<Questao>(`/admin/questoes/${id}`),
    enabled: Boolean(id),
  });
}

export function useAtualizarQuestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; dados: Partial<Questao> }) =>
      atualizar<Questao>(`/admin/questoes/${vars.id}`, vars.dados),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "questoes"] });
      qc.invalidateQueries({ queryKey: ["admin", "questao", vars.id] });
    },
  });
}

export function useCriarQuestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Partial<Questao>) =>
      criar<Questao>("/admin/questoes", dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "questoes"] });
    },
  });
}

export function useRemoverQuestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      remover<{ id: string }>(`/admin/questoes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "questoes"] });
    },
  });
}

export function useImportarQuestoes() {
  return useMutation({
    mutationFn: (dados: { arquivoNome: string; totalLinhas: number }) =>
      criar<ResultadoImportacao>("/admin/questoes/importar", dados),
  });
}

// ============================================================
// Escolas
// ============================================================

export interface EscolaComGestores extends Escola {
  gestores: Usuario[];
}

export function useAdminEscolas(filtros?: { busca?: string; ativas?: boolean }) {
  const params = new URLSearchParams();
  if (filtros?.busca) params.set("busca", filtros.busca);
  if (filtros?.ativas) params.set("ativas", "true");
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "escolas", filtros],
    queryFn: async () => {
      const r = await obter<{ dados: EscolaComGestores[] }>(
        `/admin/escolas${qs ? `?${qs}` : ""}`,
      );
      return r.dados;
    },
    staleTime: 60_000,
  });
}

// ============================================================
// Usuários
// ============================================================

export interface UsuarioComEscola extends Usuario {
  escola?: string | null;
}

export interface FiltrosUsuario {
  busca?: string;
  perfil?: PerfilUsuario[];
  escolaId?: string;
  ativos?: boolean;
  pagina?: number;
  porPagina?: number;
}

export function useAdminUsuarios(filtros?: FiltrosUsuario) {
  const params = new URLSearchParams();
  if (filtros?.busca) params.set("busca", filtros.busca);
  filtros?.perfil?.forEach((p) => params.append("perfil", p));
  if (filtros?.escolaId) params.set("escolaId", filtros.escolaId);
  if (filtros?.ativos) params.set("ativos", "true");
  if (filtros?.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros?.porPagina) params.set("porPagina", String(filtros.porPagina));
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "usuarios", filtros],
    queryFn: () =>
      obter<{
        dados: UsuarioComEscola[];
        meta: { pagina: number; porPagina: number; total: number; totalPaginas: number };
      }>(`/admin/usuarios${qs ? `?${qs}` : ""}`),
    staleTime: 30_000,
  });
}

export function useCriarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Partial<Usuario>) =>
      criar<Usuario>("/admin/usuarios", dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
    },
  });
}

// ============================================================
// Auditoria
// ============================================================

export interface AcaoAuditoriaEnriquecida extends AcaoAuditoria {
  usuario: { id: string; nome: string; fotoUrl?: string } | null;
}

export interface FiltrosAuditoria {
  tipo?: AcaoAuditoria["tipo"][];
  usuarioId?: string;
  desde?: string;
  ate?: string;
  pagina?: number;
  porPagina?: number;
}

export function useAdminAuditoria(filtros?: FiltrosAuditoria) {
  const params = new URLSearchParams();
  filtros?.tipo?.forEach((t) => params.append("tipo", t));
  if (filtros?.usuarioId) params.set("usuarioId", filtros.usuarioId);
  if (filtros?.desde) params.set("desde", filtros.desde);
  if (filtros?.ate) params.set("ate", filtros.ate);
  if (filtros?.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros?.porPagina) params.set("porPagina", String(filtros.porPagina));
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "auditoria", filtros],
    queryFn: () =>
      obter<{
        dados: AcaoAuditoriaEnriquecida[];
        meta: { pagina: number; porPagina: number; total: number; totalPaginas: number };
      }>(`/admin/auditoria${qs ? `?${qs}` : ""}`),
    staleTime: 30_000,
  });
}
