"use client";

import { useEffect } from "react";

/**
 * Força tema light enquanto a landing está montada.
 * Quando o usuário navega pra outra rota, restaura a classe dark se ela existia
 * (respeitando preferência de sistema do user).
 */
export function ForcarTemaClaro() {
  useEffect(() => {
    const html = document.documentElement;
    const tinhaDark = html.classList.contains("dark");
    html.classList.remove("dark");
    html.classList.add("light");
    return () => {
      html.classList.remove("light");
      if (tinhaDark) html.classList.add("dark");
    };
  }, []);
  return null;
}
