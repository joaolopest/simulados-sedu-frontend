export type TipoNotificacao =
  | "simulado_liberado"
  | "simulado_iniciado"
  | "simulado_finalizado"
  | "alerta_risco"
  | "diagnostico_pronto"
  | "questao_publicada"
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
