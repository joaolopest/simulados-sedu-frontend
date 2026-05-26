import { mockUsuarios as _todosUsuarios } from "./mock-usuarios";
import type { PerfilUsuario, Usuario } from "@/types";

export * from "./mock-escolas";
export * from "./mock-turmas";
export * from "./mock-usuarios";
export * from "./mock-questoes";
export * from "./mock-simulados";
export * from "./mock-resultados";
export * from "./mock-ia";
export * from "./mock-notificacoes";
export * from "./mock-auditoria";

/**
 * Lookup rápido de um usuário representativo por perfil — usado pelo
 * fluxo dev de login (botões "Entrar como X" no /login).
 */
export const mockUsuariosPorPerfil: Record<PerfilUsuario, Usuario> = {
  admin:
    _todosUsuarios.find((u) => u.perfil === "admin") ?? _todosUsuarios[0],
  gestor:
    _todosUsuarios.find((u) => u.perfil === "gestor") ?? _todosUsuarios[0],
  aluno:
    _todosUsuarios.find((u) => u.perfil === "aluno") ?? _todosUsuarios[0],
  suporte:
    _todosUsuarios.find((u) => u.perfil === "suporte") ?? _todosUsuarios[0],
};

/**
 * Simula latência de rede em ambientes mockados.
 */
export const SIMULAR_LATENCIA = (min = 200, max = 800): Promise<void> =>
  new Promise((resolver) => {
    setTimeout(resolver, min + Math.random() * (max - min));
  });

/**
 * Simula falha aleatória de requisição com base em uma probabilidade.
 */
export const SIMULAR_FALHA = (probabilidade = 0.05): boolean =>
  Math.random() < probabilidade;
