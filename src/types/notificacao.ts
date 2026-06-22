export type TipoNotificacao =
  | "simulado_liberado"
  | "simulado_iniciado"
  | "simulado_finalizado"
  | "prova_liberada"
  | "inscricao_prova"
  | "tentativa_reaberta"
  | "resultado_disponivel"
  | "alerta_risco"
  | "diagnostico_pronto"
  | "questao_publicada"
  | "revisao_questao"
  | "apoio_presencial"
  | "importacao_concluida"
  | "convite_usuario"
  | "sistema";

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  destinatarioId: string;
  origemId?: string;
  origemTipo?: string;
  lida: boolean;
  acaoUrl?: string;
  acaoLabel?: string;
  criadaEm: string;
  lidaEm?: string;
}
