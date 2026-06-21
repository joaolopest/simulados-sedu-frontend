import type { Materia, SerieEscolar } from "./questao";
import type { AdaptacaoCognitiva } from "./usuario";

export type StatusSimulado =
  | "rascunho"
  | "em_curadoria"
  | "liberado"
  | "em_andamento"
  | "finalizado"
  | "cancelado";

export type StatusAlunoSimulado =
  | "nao_iniciou"
  | "em_andamento"
  | "finalizado"
  | "desconectou"
  | "tempo_esgotado";

export interface DistribuicaoDificuldade {
  facil: number;
  medio: number;
  dificil: number;
}

export interface ParametrosSimulado {
  nome: string;
  turmaId: string;
  serie: SerieEscolar;
  materias: Materia[];
  conteudos: string[];
  quantidadeQuestoes: number;
  distribuicao: DistribuicaoDificuldade;
  adaptacoesAceitas: AdaptacaoCognitiva[];
  tempoLimiteMinutos: number;
  liberadoEm?: string;
  encerraEm?: string;
}

export interface CuradoriaIA {
  confiancaPercentual: number;
  distribuicaoReal: DistribuicaoDificuldade;
  tempoCuradoriaSegundos: number;
  geradoEm: string;
  tentativas: number;
  observacoes: string[];
}

export interface Simulado {
  id: string;
  parametros: ParametrosSimulado;
  questaoIds: string[];
  status: StatusSimulado;
  curadoria?: CuradoriaIA;
  criadoPor: string;
  escolaId: string;
  criadoEm: string;
  atualizadoEm: string;
  liberadoEm?: string;
  finalizadoEm?: string;
}

export interface SimuladoEmAndamento {
  simuladoId: string;
  alunoId: string;
  questaoAtualIndice: number;
  iniciadoEm: string;
  ultimaAtividadeEm: string;
  tempoRestanteSegundos: number;
  status: StatusAlunoSimulado;
  conexaoOk: boolean;
}
