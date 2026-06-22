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
  tentativaId?: string | null;
  tentativaNumero?: number;
  statusTentativa?: string;
  motivoReabertura?: string | null;
  respostas: RespostaQuestao[];
  notaFinal: number;
  preenchidas?: number;
  acertos: number;
  erros: number;
  emBranco: number;
  tempoTotalSegundos: number;
  iniciadoEm: string;
  finalizadoEm: string;
  desempenhoPorCompetencia: DesempenhoCompetencia[];
  desempenhoPorConteudo?: DesempenhoAgrupado[];
  desempenhoPorNivel?: DesempenhoAgrupado[];
  questoesResumo?: ResultadoQuestaoResumo[];
}

export interface DesempenhoAgrupado {
  rotulo: string;
  totalQuestoes: number;
  preenchidas?: number;
  acertos: number;
  erros?: number;
  emBranco?: number;
  taxaAcerto: number;
  tempoMedioSegundos?: number;
}

export interface DesempenhoCompetencia extends DesempenhoAgrupado {
  competencia: string;
  mediaEstadual?: number;
}

export interface ResultadoQuestaoResumo {
  questaoId: string;
  ordem: number;
  status: "acerto" | "erro" | "em_branco";
  correta: boolean;
  respondida: boolean;
  conteudo: string;
  nivel: string;
  competencias: string[];
  tempoGastoSegundos: number;
}

export interface FilaRespostaPendente {
  respostas: RespostaQuestao[];
  simuladoId: string;
  alunoId: string;
  ultimoSyncEm: string;
}
