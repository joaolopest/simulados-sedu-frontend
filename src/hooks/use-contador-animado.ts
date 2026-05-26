"use client";

import { useEffect, useState, useRef, RefObject } from "react";

interface PropriedadesContador {
  valorFinal: number;
  duracao?: number;
  formatador?: (n: number) => string;
}

export function useContadorAnimado({
  valorFinal,
  duracao = 1800,
  formatador = (n: number) => Math.round(n).toLocaleString("pt-BR"),
}: PropriedadesContador) {
  const formatadorRef = useRef(formatador);
  formatadorRef.current = formatador;
  const duracaoRef = useRef(duracao);
  duracaoRef.current = duracao;

  const [valor, setValor] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return formatador(valorFinal);
    }
    return "0";
  });

  const elementoRef = useRef<HTMLElement>(null);
  const animacaoRef = useRef<number>(null);
  const inicioRef = useRef<number>(null);

  useEffect(() => {
    const match = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
    if (match.matches) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0].isIntersecting) {
          inicioRef.current = null;
          animacaoRef.current = requestAnimationFrame(animar);
          observador.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    const animar = (timestamp: number) => {
      if (!inicioRef.current) inicioRef.current = timestamp;
      const progresso = timestamp - inicioRef.current;
      const percentual = Math.min(progresso / duracaoRef.current, 1);

      const easing = 1 - Math.pow(1 - percentual, 5);
      const valorAtual = easing * valorFinal;

      setValor(formatadorRef.current(valorAtual));

      if (percentual < 1) {
        animacaoRef.current = requestAnimationFrame(animar);
      }
    };

    if (elementoRef.current) {
      observador.observe(elementoRef.current);
    }

    return () => {
      observador.disconnect();
      if (animacaoRef.current) {
        cancelAnimationFrame(animacaoRef.current);
      }
    };
  }, [valorFinal]);

  return { ref: elementoRef as RefObject<HTMLElement>, valor };
}
