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
  qualidadeAcervo?: {
    totalQuestoes: number;
    publicadas: number;
    rascunhos: number;
    emRevisao: number;
    arquivadas: number;
    comAlertas: number;
    semRespostas: number;
    taxaMediaAcerto: number;
    principaisAlertas: { codigo: string; total: number }[];
  };
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

export interface DiagnosticoAdmin {
  status: "ok" | "atencao" | "critico" | string;
  checadoEm: string;
  ambiente: {
    tipoBanco: string;
    dialeto: string;
    hostClassificado: string;
    driver: string;
    python?: string;
    plataforma?: string;
  };
  operacional: {
    banco: {
      status: "online" | "offline" | string;
      latenciaMs: number;
      erro?: string | null;
    };
    schema: {
      tabelasEsperadas: number;
      tabelasEncontradas: number;
      tabelasAusentes: string[];
      ok: boolean;
    };
    atividade: {
      ultimaAuditoriaEm?: string | null;
      ultimaRespostaEm?: string | null;
      ultimaTentativaEm?: string | null;
    };
  };
  pendencias: {
    criticas: { codigo: string; mensagem: string; total?: number }[];
    avisos: { codigo: string; mensagem: string; total?: number }[];
  };
  recomendacoes: string[];
}

export function useAdminDiagnostico() {
  return useQuery({
    queryKey: ["admin", "diagnostico"],
    queryFn: () => obter<DiagnosticoAdmin>("/admin/diagnostico"),
    staleTime: 10_000,
    refetchInterval: 60_000,
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
  escopo?: "permitidas" | "minhas" | "escola" | "rede";
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

function montarParamsQuestoes(filtros?: FiltrosQuestao): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros?.escopo) params.set("escopo", filtros.escopo);
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
  return params;
}

export function useAdminQuestoes(filtros?: FiltrosQuestao) {
  const params = montarParamsQuestoes(filtros);
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "questoes", filtros],
    queryFn: () =>
      obter<RespostaQuestoesPaginada>(`/questoes${qs ? `?${qs}` : ""}`),
    staleTime: 15_000,
  });
}

export interface MetricasQuestao {
  questaoId: string;
  totalUsos: number;
  usosRecentes: number;
  totalRespostas: number;
  preenchidas: number;
  acertos: number;
  erros: number;
  emBranco: number;
  taxaAcerto: number;
  taxaErro: number;
  taxaBranco: number;
  tempoMedioSegundos: number;
  usadaRecentemente: boolean;
  alternativasTotal: number;
  alternativasCorretas: number;
  alertas: string[];
}

export interface ItemMetricasQuestao {
  questao: Questao;
  metricas: MetricasQuestao;
}

export interface RespostaMetricasQuestoesPaginada {
  dados: ItemMetricasQuestao[];
  meta: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
  };
}

export function useMetricasQuestoes(filtros?: FiltrosQuestao) {
  const params = montarParamsQuestoes(filtros);
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "questoes", "metricas", filtros],
    queryFn: () =>
      obter<RespostaMetricasQuestoesPaginada>(
        `/questoes/metricas${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 30_000,
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

export interface PayloadImportacaoQuestoes {
  questoes: unknown[];
  totalLinhas?: number;
  arquivoNome?: string;
}

export interface ResultadoValidacaoImportacao {
  valido: boolean;
  totalLinhas: number;
  validas: number;
  rejeitadas: ResultadoImportacao["rejeitadas"];
}

export function useImportarQuestoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: PayloadImportacaoQuestoes) =>
      criar<ResultadoImportacao>("/admin/questoes/importar", dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "questoes"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    },
  });
}

export function useValidarImportacaoQuestoes() {
  return useMutation({
    mutationFn: (dados: PayloadImportacaoQuestoes) =>
      criar<ResultadoValidacaoImportacao>(
        "/admin/questoes/importar/validar",
        dados,
      ),
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
