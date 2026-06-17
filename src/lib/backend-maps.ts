// Mapeadores: convertem o JSON do backend Python (snake_case, id int) para os
// tipos do frontend (camelCase, id string). Cada domínio migrado ganha o seu.

import type {
  AcaoAuditoria,
  AdaptacaoCognitiva,
  Escola,
  Materia,
  NivelDificuldade,
  Notificacao,
  PerfilUsuario,
  Questao,
  SerieEscolar,
  StatusQuestao,
  Usuario,
} from "@/types";

/** Shape que o Python devolve para usuário (ver _serializar_usuario no back). */
export interface UsuarioBackend {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  criado_em: string | null;
  atualizado_em?: string | null;
  escola_id?: number | null;
  escola_nome?: string | null;
  turma_id?: number | null;
  adaptacoes?: AdaptacaoCognitiva[];
}

export function mapUsuario(py: UsuarioBackend): Usuario {
  const agora = new Date().toISOString();
  return {
    id: String(py.id),
    nome: py.nome,
    email: py.email,
    perfil: py.perfil as PerfilUsuario,
    ativo: py.ativo,
    criadoEm: py.criado_em ?? agora,
    atualizadoEm: py.atualizado_em ?? py.criado_em ?? agora,
    escolaId: py.escola_id != null ? String(py.escola_id) : undefined,
    turmaIds: py.turma_id != null ? [String(py.turma_id)] : undefined,
    adaptacoes: py.adaptacoes,
  };
}

// ---------- Escola ----------

export interface EscolaBackend {
  id: number;
  nome: string;
  municipio?: string | null;
  codigo_inep?: string | null;
  uf?: string | null;
  endereco?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email_contato?: string | null;
  ativa?: boolean | null;
  total_turmas?: number;
  total_alunos?: number;
  total_professores?: number;
  criada_em?: string | null;
  atualizada_em?: string | null;
}

// O modelo Python de escola é "magro": só id/nome/município/INEP/totais.
// Campos sem coluna no banco (uf, endereço, gestores, etc.) entram com padrão.
export function mapEscola(py: EscolaBackend): Escola {
  const agora = new Date().toISOString();
  return {
    id: String(py.id),
    nome: py.nome,
    codigoInep: py.codigo_inep ?? "",
    municipio: py.municipio ?? "",
    uf: py.uf ?? "ES",
    endereco: py.endereco ?? "",
    cep: py.cep ?? "",
    telefone: py.telefone ?? undefined,
    emailContato: py.email_contato ?? undefined,
    gestorIds: [],
    totalAlunos: py.total_alunos ?? 0,
    totalTurmas: py.total_turmas ?? 0,
    totalProfessores: py.total_professores ?? 0,
    ativa: py.ativa ?? true,
    criadaEm: py.criada_em ?? agora,
    atualizadaEm: py.atualizada_em ?? py.criada_em ?? agora,
  };
}

// ---------- Questão ----------

// coded -> nome de exibição (mesmas tabelas do seed do backend). O Python
// guarda/filtra por NOME ("Matemática"); o front usa o code ("matematica").
const SERIE_COD_NOME: Record<string, string> = {
  "1_fundamental": "1º ano",
  "2_fundamental": "2º ano",
  "3_fundamental": "3º ano",
  "4_fundamental": "4º ano",
  "5_fundamental": "5º ano",
  "6_fundamental": "6º ano",
  "7_fundamental": "7º ano",
  "8_fundamental": "8º ano",
  "9_fundamental": "9º ano",
  "1_medio": "1ª série EM",
  "2_medio": "2ª série EM",
  "3_medio": "3ª série EM",
};
const MATERIA_COD_NOME: Record<string, string> = {
  portugues: "Português",
  matematica: "Matemática",
  ciencias: "Ciências",
  historia: "História",
  geografia: "Geografia",
  ingles: "Inglês",
  artes: "Artes",
  educacao_fisica: "Educação Física",
  fisica: "Física",
  quimica: "Química",
  biologia: "Biologia",
  filosofia: "Filosofia",
  sociologia: "Sociologia",
};
const NIVEL_COD_NOME: Record<string, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

function inverter(m: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));
}
const SERIE_NOME_COD = inverter(SERIE_COD_NOME);
const MATERIA_NOME_COD = inverter(MATERIA_COD_NOME);
const NIVEL_NOME_COD = inverter(NIVEL_COD_NOME);

// coded -> nome (para mandar filtros/payload ao Python)
export const serieParaNome = (cod: string): string => SERIE_COD_NOME[cod] ?? cod;
export const materiaParaNome = (cod: string): string =>
  MATERIA_COD_NOME[cod] ?? cod;
export const nivelParaNome = (cod: string): string => NIVEL_COD_NOME[cod] ?? cod;

interface AlternativaBackend {
  id: number;
  texto: string;
  correta: boolean;
  ordem_original: number;
}

export interface QuestaoBackend {
  id: number;
  enunciado: string;
  imagem_url?: string | null;
  serie: string;
  materia: string;
  conteudo: string;
  nivel: string;
  adaptacoes: AdaptacaoCognitiva[];
  status: string;
  tempo_estimado_segundos: number;
  competencias: string[];
  explicacao?: string | null;
  versao: number;
  criado_por_id?: number | null;
  escola_id?: number | null;
  criada_em: string | null;
  atualizada_em?: string | null;
  alternativas: AlternativaBackend[];
}

export function mapQuestao(py: QuestaoBackend): Questao {
  const agora = new Date().toISOString();
  return {
    id: String(py.id),
    enunciado: py.enunciado,
    imagemUrl: py.imagem_url ?? undefined,
    serie: (SERIE_NOME_COD[py.serie] ?? py.serie) as SerieEscolar,
    materia: (MATERIA_NOME_COD[py.materia] ?? py.materia) as Materia,
    conteudo: py.conteudo,
    nivel: (NIVEL_NOME_COD[py.nivel] ?? py.nivel) as NivelDificuldade,
    alternativas: (py.alternativas ?? []).map((a) => ({
      id: String(a.id),
      texto: a.texto,
      correta: a.correta,
      ordem: a.ordem_original,
    })),
    adaptacoes: py.adaptacoes ?? [],
    tempoEstimadoSegundos: py.tempo_estimado_segundos ?? 60,
    status: (py.status ?? "rascunho") as StatusQuestao,
    competencias: py.competencias ?? [],
    criadoPor: py.criado_por_id != null ? String(py.criado_por_id) : "",
    escolaId: py.escola_id != null ? String(py.escola_id) : undefined,
    criadoEm: py.criada_em ?? agora,
    atualizadoEm: py.atualizada_em ?? py.criada_em ?? agora,
    versao: py.versao ?? 1,
    explicacao: py.explicacao ?? undefined,
  };
}

// ---------- Notificação ----------

export interface NotificacaoBackend {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  destinatario_id: number;
  origem_id?: string | null;
  origem_tipo?: string | null;
  lida: boolean;
  acao_url?: string | null;
  acao_label?: string | null;
  criada_em: string | null;
  lida_em?: string | null;
}

export function mapNotificacao(py: NotificacaoBackend): Notificacao {
  return {
    id: String(py.id),
    tipo: py.tipo as Notificacao["tipo"],
    titulo: py.titulo,
    mensagem: py.mensagem,
    destinatarioId: String(py.destinatario_id),
    origemId: py.origem_id ?? undefined,
    origemTipo: py.origem_tipo ?? undefined,
    lida: py.lida,
    acaoUrl: py.acao_url ?? undefined,
    acaoLabel: py.acao_label ?? undefined,
    criadaEm: py.criada_em ?? new Date().toISOString(),
    lidaEm: py.lida_em ?? undefined,
  };
}

// ---------- Auditoria ----------

export interface AuditoriaBackend {
  id: number;
  tipo: string;
  usuario_id?: number | null;
  usuario_nome: string;
  alvo_tipo?: string | null;
  alvo_id?: string | null;
  detalhes?: string | null;
  ip_origem?: string | null;
  ocorrido_em: string | null;
  usuario?: { id: number; nome: string; foto_url?: string | null } | null;
}

export type AcaoAuditoriaEnriquecida = AcaoAuditoria & {
  usuario: { id: string; nome: string; fotoUrl?: string } | null;
};

export function mapAuditoria(py: AuditoriaBackend): AcaoAuditoriaEnriquecida {
  return {
    id: String(py.id),
    tipo: py.tipo as AcaoAuditoria["tipo"],
    usuarioId: py.usuario_id != null ? String(py.usuario_id) : "",
    usuarioNome: py.usuario_nome,
    alvoTipo: (py.alvo_tipo ?? undefined) as AcaoAuditoria["alvoTipo"],
    alvoId: py.alvo_id ?? undefined,
    detalhes: py.detalhes ?? undefined,
    ipOrigem: py.ip_origem ?? undefined,
    ocorridoEm: py.ocorrido_em ?? new Date().toISOString(),
    usuario: py.usuario
      ? {
          id: String(py.usuario.id),
          nome: py.usuario.nome,
          fotoUrl: py.usuario.foto_url ?? undefined,
        }
      : null,
  };
}
