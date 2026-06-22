import type { PerfilUsuario } from "@/types/usuario";

export type Permissao =
  | "dashboard.admin.ver"
  | "dashboard.gestor.ver"
  | "dashboard.professor.ver"
  | "questoes.ver"
  | "questoes.criar"
  | "questoes.editar.proprias"
  | "questoes.editar.escola"
  | "questoes.publicar.escola"
  | "questoes.publicar.qualquer"
  | "questoes.arquivar.escola"
  | "questoes.excluir.qualquer"
  | "questoes.revisao.solicitar"
  | "questoes.revisao.resolver"
  | "provas.ver"
  | "provas.criar"
  | "provas.liberar"
  | "escolas.gerenciar"
  | "usuarios.gerenciar"
  | "configuracoes.gerenciar"
  | "auditoria.ver"
  | "turmas.ver"
  | "alertas.ver"
  | "suporte.alunos.ver"
  | "suporte.notas.criar"
  | "suporte.apoio.criar"
  | "aluno.home.ver"
  | "aluno.historico.ver"
  | "aluno.simulado.responder"
  | "notificacoes.ver"
  | "perfil.ver"
  | "candidato.supletivo.ver";

export interface ItemNavegacao {
  id: string;
  href: string;
  rotulo: string;
  permissao: Permissao;
  matchPrefix?: boolean;
}

export const HOME_POR_PERFIL = {
  admin: "/admin/dashboard",
  gestor: "/gestor/dashboard",
  professor: "/professor/dashboard",
  suporte: "/suporte/dashboard",
  aluno: "/aluno/home",
  candidato: "/aluno/home",
} as const satisfies Record<PerfilUsuario, string>;

export const ROTULO_PERFIL = {
  admin: "Administrador — Secretaria",
  gestor: "Gestor — Coordenação",
  professor: "Professor",
  suporte: "Suporte — Professor/Secretário",
  aluno: "Aluno",
  candidato: "Candidato",
} as const satisfies Record<PerfilUsuario, string>;

export const ROTULO_CURTO_PERFIL = {
  admin: "Secretaria",
  gestor: "Coordenação pedagógica",
  professor: "Professor",
  suporte: "Suporte pedagógico",
  aluno: "Aluno",
  candidato: "Candidato",
} as const satisfies Record<PerfilUsuario, string>;

export const TOM_PERFIL = {
  admin: "bg-primary-muted text-primary-text",
  gestor: "bg-ia-muted text-ia",
  professor: "bg-muted text-foreground",
  suporte: "bg-warning-muted text-warning",
  aluno: "bg-success-muted text-success",
  candidato: "bg-success-muted text-success",
} as const satisfies Record<PerfilUsuario, string>;

export const PERMISSOES_POR_PERFIL = {
  admin: [
    "dashboard.admin.ver",
    "questoes.ver",
    "questoes.criar",
    "questoes.editar.proprias",
    "questoes.editar.escola",
    "questoes.publicar.escola",
    "questoes.publicar.qualquer",
    "questoes.arquivar.escola",
    "questoes.excluir.qualquer",
    "questoes.revisao.resolver",
    "provas.ver",
    "provas.criar",
    "provas.liberar",
    "escolas.gerenciar",
    "usuarios.gerenciar",
    "configuracoes.gerenciar",
    "auditoria.ver",
    "turmas.ver",
    "alertas.ver",
    "suporte.alunos.ver",
    "notificacoes.ver",
    "perfil.ver",
  ],
  gestor: [
    "dashboard.gestor.ver",
    "questoes.ver",
    "questoes.criar",
    "questoes.editar.escola",
    "questoes.publicar.escola",
    "questoes.arquivar.escola",
    "questoes.revisao.solicitar",
    "provas.ver",
    "provas.criar",
    "provas.liberar",
    "turmas.ver",
    "alertas.ver",
    "suporte.alunos.ver",
    "suporte.notas.criar",
    "suporte.apoio.criar",
    "notificacoes.ver",
    "perfil.ver",
  ],
  professor: [
    "dashboard.professor.ver",
    "questoes.ver",
    "questoes.criar",
    "questoes.editar.proprias",
    "questoes.revisao.solicitar",
    "provas.ver",
    "provas.criar",
    "notificacoes.ver",
    "perfil.ver",
  ],
  suporte: [
    "suporte.alunos.ver",
    "suporte.notas.criar",
    "suporte.apoio.criar",
    "notificacoes.ver",
    "perfil.ver",
  ],
  aluno: [
    "aluno.home.ver",
    "aluno.historico.ver",
    "aluno.simulado.responder",
    "notificacoes.ver",
    "perfil.ver",
  ],
  candidato: [
    "aluno.home.ver",
    "aluno.historico.ver",
    "aluno.simulado.responder",
    "notificacoes.ver",
    "perfil.ver",
    "candidato.supletivo.ver",
  ],
} as const satisfies Record<PerfilUsuario, readonly Permissao[]>;

export const NAVEGACAO_POR_PERFIL = {
  admin: [
    {
      id: "dashboard",
      href: "/admin/dashboard",
      rotulo: "Dashboard",
      permissao: "dashboard.admin.ver",
    },
    {
      id: "questoes",
      href: "/admin/questoes",
      rotulo: "Questões",
      permissao: "questoes.ver",
      matchPrefix: true,
    },
    {
      id: "provas",
      href: "/admin/provas",
      rotulo: "Provas",
      permissao: "provas.ver",
      matchPrefix: true,
    },
    {
      id: "escolas",
      href: "/admin/escolas",
      rotulo: "Escolas",
      permissao: "escolas.gerenciar",
    },
    {
      id: "usuarios",
      href: "/admin/usuarios",
      rotulo: "Usuários",
      permissao: "usuarios.gerenciar",
    },
    {
      id: "configuracoes",
      href: "/admin/configuracoes",
      rotulo: "Configuracoes",
      permissao: "configuracoes.gerenciar",
    },
    {
      id: "auditoria",
      href: "/admin/auditoria",
      rotulo: "Auditoria",
      permissao: "auditoria.ver",
    },
  ],
  gestor: [
    {
      id: "dashboard",
      href: "/gestor/dashboard",
      rotulo: "Dashboard",
      permissao: "dashboard.gestor.ver",
    },
    {
      id: "simulados",
      href: "/gestor/simulados",
      rotulo: "Simulados",
      permissao: "provas.ver",
      matchPrefix: true,
    },
    {
      id: "criar-prova",
      href: "/gestor/provas/nova",
      rotulo: "Criar prova",
      permissao: "provas.criar",
    },
    {
      id: "turmas",
      href: "/gestor/turmas",
      rotulo: "Turmas",
      permissao: "turmas.ver",
    },
    {
      id: "alertas",
      href: "/gestor/alertas",
      rotulo: "Alertas IA",
      permissao: "alertas.ver",
    },
  ],
  professor: [
    {
      id: "dashboard",
      href: "/professor/dashboard",
      rotulo: "Início",
      permissao: "dashboard.professor.ver",
    },
    {
      id: "questoes",
      href: "/professor/questoes",
      rotulo: "Minhas questões",
      permissao: "questoes.ver",
      matchPrefix: true,
    },
    {
      id: "provas",
      href: "/professor/provas",
      rotulo: "Provas",
      permissao: "provas.ver",
      matchPrefix: true,
    },
  ],
  suporte: [
    {
      id: "meus-alunos",
      href: "/suporte/dashboard",
      rotulo: "Meus alunos",
      permissao: "suporte.alunos.ver",
    },
  ],
  aluno: [
    {
      id: "inicio",
      href: "/aluno/home",
      rotulo: "Início",
      permissao: "aluno.home.ver",
    },
    {
      id: "historico",
      href: "/aluno/historico",
      rotulo: "Histórico",
      permissao: "aluno.historico.ver",
    },
    {
      id: "notificacoes",
      href: "/notificacoes",
      rotulo: "Avisos",
      permissao: "notificacoes.ver",
    },
    {
      id: "perfil",
      href: "/perfil",
      rotulo: "Perfil",
      permissao: "perfil.ver",
    },
  ],
  candidato: [
    {
      id: "inicio",
      href: "/aluno/home",
      rotulo: "Início",
      permissao: "aluno.home.ver",
    },
    {
      id: "historico",
      href: "/aluno/historico",
      rotulo: "Histórico",
      permissao: "aluno.historico.ver",
    },
    {
      id: "notificacoes",
      href: "/notificacoes",
      rotulo: "Avisos",
      permissao: "notificacoes.ver",
    },
    {
      id: "perfil",
      href: "/perfil",
      rotulo: "Perfil",
      permissao: "perfil.ver",
    },
  ],
} as const satisfies Record<PerfilUsuario, readonly ItemNavegacao[]>;

export function temPermissao(
  perfil: PerfilUsuario | null | undefined,
  permissao: Permissao,
): boolean {
  if (!perfil) return false;
  const permissoes: readonly Permissao[] = PERMISSOES_POR_PERFIL[perfil];
  return permissoes.includes(permissao);
}

export function navegacaoPermitida(perfil: PerfilUsuario): ItemNavegacao[] {
  return NAVEGACAO_POR_PERFIL[perfil].filter((item) =>
    temPermissao(perfil, item.permissao),
  );
}
