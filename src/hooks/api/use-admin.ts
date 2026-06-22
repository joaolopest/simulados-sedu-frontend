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
    // Painel administrativo: sempre busca números atuais ao abrir/focar a aba,
    // pra refletir em (quase) tempo real questões/provas/escolas recém-criadas.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
}

// ============================================================
// Configuracoes
// ============================================================

export type ChaveConfiguracaoSistema = "provas" | "acessibilidade" | "resultados";

export interface ConfiguracaoSistema {
  id: string;
  chave: ChaveConfiguracaoSistema;
  valor: Record<string, unknown>;
  descricao?: string | null;
  atualizadoPorId?: string | null;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
}

export function useAdminConfiguracoes() {
  return useQuery({
    queryKey: ["admin", "configuracoes"],
    queryFn: async () => {
      const r = await obter<{ dados: ConfiguracaoSistema[] }>("/configuracoes");
      return r.dados;
    },
    staleTime: 10_000,
  });
}

export function useAtualizarConfiguracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      chave: ChaveConfiguracaoSistema;
      valor: Record<string, unknown>;
    }) =>
      atualizar<ConfiguracaoSistema>(`/configuracoes/${vars.chave}`, {
        valor: vars.valor,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "configuracoes"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    },
  });
}

// ============================================================
// Questões
// ============================================================

export interface FiltrosQuestao {
  busca?: string;
  serie?: SerieEscolar[];
  materia?: Materia[];
  conteudo?: string[];
  nivel?: NivelDificuldade[];
  status?: StatusQuestao[];
  adaptacao?: AdaptacaoCognitiva[];
  competencia?: string[];
  escolaId?: string[];
  criadoPor?: string[];
  comImagem?: boolean;
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
  filtros?.conteudo?.forEach((c) => params.append("conteudo", c));
  filtros?.nivel?.forEach((n) => params.append("nivel", n));
  filtros?.status?.forEach((s) => params.append("status", s));
  filtros?.adaptacao?.forEach((a) => params.append("adaptacao", a));
  filtros?.competencia?.forEach((c) => params.append("competencia", c));
  filtros?.escolaId?.forEach((id) => params.append("escolaId", id));
  filtros?.criadoPor?.forEach((id) => params.append("criadoPor", id));
  if (typeof filtros?.comImagem === "boolean") {
    params.set("comImagem", String(filtros.comImagem));
  }
  if (filtros?.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros?.porPagina) params.set("porPagina", String(filtros.porPagina));
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "questoes", filtros],
    queryFn: () =>
      obter<RespostaQuestoesPaginada>(`/questoes${qs ? `?${qs}` : ""}`),
    staleTime: 15_000,
  });
}

export function useAdminQuestao(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "questao", id],
    queryFn: () => obter<Questao>(`/questoes/${id}`),
    enabled: Boolean(id),
  });
}

export function useAtualizarQuestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; dados: Partial<Questao> }) =>
      atualizar<Questao>(`/questoes/${vars.id}`, vars.dados),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "questoes"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
      qc.invalidateQueries({ queryKey: ["admin", "questao", vars.id] });
    },
  });
}

export function useCriarQuestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Partial<Questao>) =>
      criar<Questao>("/questoes", dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "questoes"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    },
  });
}

export function useRemoverQuestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      remover<{ id: string }>(`/questoes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "questoes"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
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

export function useCriarEscola() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Partial<Escola>) =>
      criar<EscolaComGestores>("/admin/escolas", dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "escolas"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    },
  });
}

export function useRemoverEscola() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      remover<{ id: string }>(`/admin/escolas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "escolas"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    },
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
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    },
  });
}

export function useAtualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; dados: Partial<Usuario> }) =>
      atualizar<UsuarioComEscola>(`/admin/usuarios/${vars.id}`, vars.dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    },
  });
}

export function useAlterarStatusUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; ativo: boolean }) =>
      atualizar<UsuarioComEscola>(`/admin/usuarios/${vars.id}`, {
        ativo: vars.ativo,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    },
  });
}

export function useRemoverUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      remover<{ id: string }>(`/admin/usuarios/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
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
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}
