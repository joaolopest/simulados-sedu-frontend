export type PerfilUsuario = "admin" | "gestor" | "aluno" | "suporte";

export type AdaptacaoCognitiva =
  | "tdah"
  | "dislexia"
  | "discalculia"
  | "autismo"
  | "deficiencia_visual"
  | "deficiencia_auditiva";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  fotoUrl?: string;
  escolaId?: string;
  turmaIds?: string[];
  adaptacoes?: AdaptacaoCognitiva[];
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  ultimoAcesso?: string;
}

export interface UsuarioAutenticado extends Usuario {
  token: string;
  expiraEm: string;
}

export interface PreferenciasAcessibilidade {
  tamanhoFonte: "padrao" | "grande" | "extra-grande";
  altoContraste: boolean;
  fonteDislexia: boolean;
  reducaoMotion: boolean;
}
