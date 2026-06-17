import type { SerieEscolar } from "./questao";

export interface Escola {
  id: string;
  nome: string;
  codigoInep: string;
  municipio: string;
  uf: string;
  endereco: string;
  cep: string;
  telefone?: string;
  emailContato?: string;
  diretorId?: string;
  gestorIds: string[];
  totalAlunos: number;
  totalTurmas: number;
  totalProfessores: number;
  ativa: boolean;
  criadaEm: string;
  atualizadaEm: string;
}

export interface Turma {
  id: string;
  nome: string;
  escolaId: string;
  serie: SerieEscolar;
  turno: "matutino" | "vespertino" | "noturno" | "integral";
  anoLetivo: number;
  alunoIds: string[];
  professorResponsavelId?: string;
  ativa: boolean;
  criadaEm: string;
}

export interface AcaoAuditoria {
  id: string;
  tipo:
    | "login"
    | "logout"
    | "criar_questao"
    | "editar_questao"
    | "publicar_questao"
    | "remover_questao"
    | "arquivar_questao"
    | "solicitacao_revisao"
    | "resolucao_revisao"
    | "importacao"
    | "importar_questoes"
    | "criar_simulado"
    | "gerar_simulado"
    | "montar_simulado"
    | "editar_simulado"
    | "liberar_simulado"
    | "finalizar_simulado"
    | "criar_usuario"
    | "editar_usuario"
    | "remover_usuario"
    | "criar_escola"
    | "editar_escola"
    | "remover_escola"
    | "criar_aluno"
    | "inscrever_aluno_simulado"
    | "responder_questao"
    | "finalizar_respostas"
    | "registrar_nota_suporte"
    | "solicitar_apoio_presencial";
  usuarioId: string;
  usuarioNome: string;
  alvoTipo?: "questao" | "simulado" | "usuario" | "escola" | "aluno" | "revisao_questao";
  alvoId?: string;
  detalhes?: string;
  ipOrigem?: string;
  ocorridoEm: string;
}
