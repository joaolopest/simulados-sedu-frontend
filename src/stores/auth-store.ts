"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PerfilUsuario, UsuarioAutenticado } from "@/types";

const NOME_COOKIE_TOKEN = "sedu-token";
const NOME_COOKIE_PERFIL = "sedu-perfil";
const VALIDADE_COOKIE_HORAS = 8;

function gravarCookieDocumento(nome: string, valor: string, horas: number): void {
  if (typeof document === "undefined") return;
  const expira = new Date();
  expira.setTime(expira.getTime() + horas * 60 * 60 * 1000);
  // SameSite=Lax para o cookie viajar em navegação top-level (proxy.ts lê ele).
  // Sem flag Secure em dev (HTTP). Em produção, sirva via HTTPS — o browser
  // ignora Secure se não estiver em https, então pode ficar sempre ligado.
  document.cookie = `${nome}=${encodeURIComponent(valor)}; expires=${expira.toUTCString()}; path=/; SameSite=Lax`;
}

function apagarCookieDocumento(nome: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${nome}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function gravarCookiesAuth(usuario: UsuarioAutenticado): void {
  gravarCookieDocumento(NOME_COOKIE_TOKEN, usuario.token, VALIDADE_COOKIE_HORAS);
  gravarCookieDocumento(NOME_COOKIE_PERFIL, usuario.perfil, VALIDADE_COOKIE_HORAS);
}

function apagarCookiesAuth(): void {
  apagarCookieDocumento(NOME_COOKIE_TOKEN);
  apagarCookieDocumento(NOME_COOKIE_PERFIL);
}

export interface EstadoAuth {
  usuario: UsuarioAutenticado | null;
  carregandoAuth: boolean;
  fazerLogin: (usuario: UsuarioAutenticado) => void;
  fazerLogout: () => void;
  atualizarUsuario: (parcial: Partial<UsuarioAutenticado>) => void;
  obterPerfil: () => PerfilUsuario | null;
  estaAutenticado: () => boolean;
}

export const useAuthStore = create<EstadoAuth>()(
  persist(
    (set, get) => ({
      usuario: null,
      carregandoAuth: false,

      fazerLogin: (usuario) => {
        gravarCookiesAuth(usuario);
        set({ usuario, carregandoAuth: false });
      },

      fazerLogout: () => {
        apagarCookiesAuth();
        set({ usuario: null, carregandoAuth: false });
      },

      atualizarUsuario: (parcial) => {
        const atual = get().usuario;
        if (!atual) return;
        const atualizado: UsuarioAutenticado = { ...atual, ...parcial };
        // Se trocou perfil ou token, atualiza cookies para o proxy ver.
        if (parcial.token !== undefined || parcial.perfil !== undefined) {
          gravarCookiesAuth(atualizado);
        }
        set({ usuario: atualizado });
      },

      obterPerfil: () => get().usuario?.perfil ?? null,

      estaAutenticado: () => {
        const usuario = get().usuario;
        if (!usuario) return false;
        const expiraEm = new Date(usuario.expiraEm).getTime();
        if (Number.isNaN(expiraEm)) return true;
        return Date.now() < expiraEm;
      },
    }),
    {
      name: "sedu-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (estado) => ({ usuario: estado.usuario }),
      onRehydrateStorage: () => (estado) => {
        // Garante que cookie e store fiquem sincronizados após hydratação.
        if (estado?.usuario) {
          gravarCookiesAuth(estado.usuario);
        }
      },
    },
  ),
);
