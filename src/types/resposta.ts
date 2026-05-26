export type StatusResposta = "em_branco" | "respondida" | "marcada_revisao";

export interface RespostaQuestao {
  questaoId: string;
  alternativaId?: string;
  status: StatusResposta;
  tempoGastoSegundos: number;
  trocasDeResposta: number;
  respondidaEm?: string;
}

export interface ResultadoSimulado {
  id: string;
  simuladoId: string;
  alunoId: string;
  respostas: RespostaQuestao[];
  notaFinal: number;
  acertos: number;
  erros: number;
  emBranco: number;
  tempoTotalSegundos: number;
  iniciadoEm: string;
  finalizadoEm: string;
  desempenhoPorCompetencia: DesempenhoCompetencia[];
}

export interface DesempenhoCompetencia {
  competencia: string;
  totalQuestoes: number;
  acertos: number;
  taxaAcerto: number;
  mediaEstadual?: number;
}

export interface FilaRespostaPendente {
  respostas: RespostaQuestao[];
  simuladoId: string;
  alunoId: string;
  ultimoSyncEm: string;
}
