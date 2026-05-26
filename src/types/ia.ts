export type NivelConfiancaIA = "alta" | "media" | "baixa";

export interface InsightIA {
  id: string;
  titulo: string;
  texto: string;
  geradoEm: string;
  modeloUsado: string;
  contextoIds: string[];
}

export interface DiagnosticoSimulado {
  id: string;
  simuladoId: string;
  resumoExecutivo: string;
  pontosFortes: string[];
  pontosAtencao: string[];
  recomendacoesPedagogicas: string[];
  geradoEm: string;
  modeloUsado: string;
  confiancaPercentual: number;
}

export interface PrevisaoRiscoAluno {
  alunoId: string;
  probabilidadeEvasao: number;
  probabilidadeReprovacao: number;
  fatoresContribuintes: FatorRisco[];
  tendencia: "subindo" | "estavel" | "caindo";
  ultimaAtualizacao: string;
  competenciasFracas: string[];
  recomendacoes: string[];
}

export interface FatorRisco {
  fator: string;
  peso: number;
  descricao: string;
}

export interface SugestaoReforco {
  competencia: string;
  conteudo: string;
  tipoMaterial: "video" | "texto" | "exercicio" | "atividade";
  url?: string;
  descricao: string;
}

export interface MensagemResultadoIA {
  texto: string;
  tom: "celebrativo" | "encorajador" | "construtivo";
  geradoEm: string;
}
