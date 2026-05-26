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
    | "importar_questoes"
    | "criar_simulado"
    | "liberar_simulado"
    | "criar_usuario"
    | "editar_usuario";
  usuarioId: string;
  usuarioNome: string;
  alvoTipo?: "questao" | "simulado" | "usuario" | "escola";
  alvoId?: string;
  detalhes?: string;
  ipOrigem?: string;
  ocorridoEm: string;
}
