"use client";

import { useEffect, useRef } from "react";

export interface Atalho {
  tecla: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  acao: () => void;
  descricao: string;
}

function ehElementoEditavel(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (alvo.isContentEditable) return true;
  return false;
}

export function useAtalhosTeclado(
  atalhos: Atalho[],
  habilitado: boolean = true,
): void {
  const atalhosRef = useRef<Atalho[]>(atalhos);

  useEffect(() => {
    atalhosRef.current = atalhos;
  }, [atalhos]);

  useEffect(() => {
    if (!habilitado) return;
    if (typeof window === "undefined") return;

    const aoTeclar = (evento: KeyboardEvent): void => {
      if (ehElementoEditavel(evento.target)) return;

      const tecla = evento.key.toLowerCase();
      for (const atalho of atalhosRef.current) {
        const teclaAlvo = atalho.tecla.toLowerCase();
        const ctrlOk = (atalho.ctrl ?? false) === evento.ctrlKey;
        const shiftOk = (atalho.shift ?? false) === evento.shiftKey;
        const altOk = (atalho.alt ?? false) === evento.altKey;
        const metaOk = (atalho.meta ?? false) === evento.metaKey;

        if (teclaAlvo === tecla && ctrlOk && shiftOk && altOk && metaOk) {
          evento.preventDefault();
          atalho.acao();
          return;
        }
      }
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [habilitado]);
}
