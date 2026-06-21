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
  const duracaoRef = useRef(duracao);

  useEffect(() => {
    formatadorRef.current = formatador;
  }, [formatador]);

  useEffect(() => {
    duracaoRef.current = duracao;
  }, [duracao]);

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
    if (match.matches) {
      setValor(formatadorRef.current(valorFinal));
      return;
    }

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

    const iniciar = () => {
      inicioRef.current = null;
      if (animacaoRef.current) {
        cancelAnimationFrame(animacaoRef.current);
      }
      animacaoRef.current = requestAnimationFrame(animar);
    };

    if (elementoRef.current) {
      const rect = elementoRef.current.getBoundingClientRect();
      const visivel =
        rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3;
      if (visivel) {
        iniciar();
        return () => {
          if (animacaoRef.current) {
            cancelAnimationFrame(animacaoRef.current);
          }
        };
      }
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0].isIntersecting) {
          iniciar();
          observador.disconnect();
        }
      },
      { threshold: 0.3 }
    );

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
