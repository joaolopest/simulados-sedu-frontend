import type { AdaptacaoCognitiva } from "./usuario";

export type SerieEscolar =
  | "1_fundamental"
  | "2_fundamental"
  | "3_fundamental"
  | "4_fundamental"
  | "5_fundamental"
  | "6_fundamental"
  | "7_fundamental"
  | "8_fundamental"
  | "9_fundamental"
  | "1_medio"
  | "2_medio"
  | "3_medio";

export type Materia =
  | "portugues"
  | "matematica"
  | "ciencias"
  | "historia"
  | "geografia"
  | "ingles"
  | "artes"
  | "educacao_fisica"
  | "fisica"
  | "quimica"
  | "biologia"
  | "filosofia"
  | "sociologia";

export type NivelDificuldade = "facil" | "medio" | "dificil";

export type StatusQuestao = "rascunho" | "publicada" | "arquivada";

export interface Alternativa {
  id: string;
  texto: string;
  correta: boolean;
  ordem: number;
}

export interface Questao {
  id: string;
  enunciado: string;
  imagemUrl?: string;
  serie: SerieEscolar;
  materia: Materia;
  conteudo: string;
  nivel: NivelDificuldade;
  alternativas: Alternativa[];
  adaptacoes: AdaptacaoCognitiva[];
  tempoEstimadoSegundos: number;
  status: StatusQuestao;
  competencias: string[];
  criadoPor: string;
  escolaId?: string;
  criadoEm: string;
  atualizadoEm: string;
  versao: number;
  explicacao?: string;
}

export interface FiltroQuestao {
  serie?: SerieEscolar[];
  materia?: Materia[];
  conteudo?: string[];
  nivel?: NivelDificuldade[];
  adaptacoes?: AdaptacaoCognitiva[];
  status?: StatusQuestao[];
  busca?: string;
}

export interface ResultadoImportacao {
  totalLinhas: number;
  importadas: number;
  rejeitadas: ItemRejeitado[];
  iniciadoEm: string;
  finalizadoEm?: string;
}

export interface ItemRejeitado {
  linha: number;
  campo: string;
  motivo: string;
  valor: unknown;
}
