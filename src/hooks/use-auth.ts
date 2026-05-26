"use client";

import { useCallback } from "react";
import type {
  PerfilUsuario,
  Usuario,
  UsuarioAutenticado,
} from "@/types";
import { useAuthStore } from "@/stores/auth-store";
import { criar } from "@/lib/api";

interface RespostaLogin {
  usuario: UsuarioAutenticado;
}

export function useAuth(): {
  usuario: UsuarioAutenticado | null;
  perfil: PerfilUsuario | null;
  autenticado: boolean;
  carregando: boolean;
  login: (
    email: string,
    senha: string,
    perfilDev?: PerfilUsuario,
  ) => Promise<UsuarioAutenticado>;
  logout: () => Promise<void>;
  atualizarUsuario: (parcial: Partial<Usuario>) => void;
} {
  const usuario = useAuthStore((estado) => estado.usuario);
  const carregando = useAuthStore((estado) => estado.carregandoAuth);
  const fazerLogin = useAuthStore((estado) => estado.fazerLogin);
  const fazerLogout = useAuthStore((estado) => estado.fazerLogout);
  const atualizarUsuarioStore = useAuthStore(
    (estado) => estado.atualizarUsuario,
  );

  const login = useCallback(
    async (
      email: string,
      senha: string,
      perfilDev?: PerfilUsuario,
    ): Promise<UsuarioAutenticado> => {
      const corpo = perfilDev
        ? { perfilDev }
        : { email, senha };
      const resposta = await criar<RespostaLogin>("/auth/login", corpo);
      // fazerLogin grava o cookie sedu-token via auth-store; lib/api lê do cookie.
      fazerLogin(resposta.usuario);
      return resposta.usuario;
    },
    [fazerLogin],
  );

  const logout = useCallback(async () => {
    try {
      await criar<void>("/auth/logout");
    } catch {
      // mesmo se falhar a chamada, limpa local
    }
    fazerLogout();
  }, [fazerLogout]);

  const atualizarUsuario = useCallback(
    (parcial: Partial<Usuario>) => {
      atualizarUsuarioStore(parcial);
    },
    [atualizarUsuarioStore],
  );

  return {
    usuario,
    perfil: usuario?.perfil ?? null,
    autenticado: usuario !== null,
    carregando,
    login,
    logout,
    atualizarUsuario,
  };
}
