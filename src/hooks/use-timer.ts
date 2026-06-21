"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface OpcoesTimer {
  duracaoSegundos: number;
  iniciar?: boolean;
  avisos?: number[];
  aoTerminar?: () => void;
  aoAvisar?: (segundosRestantes: number) => void;
  persistirEm?: string;
}

interface EstadoPersistido {
  segundosRestantes: number;
  rodando: boolean;
  ultimoTickEm: number;
}

interface EstadoTimer {
  segundosRestantes: number;
  rodando: boolean;
}

function lerPersistido(chave: string): EstadoPersistido | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(chave);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as EstadoPersistido;
    if (
      typeof dados.segundosRestantes !== "number" ||
      typeof dados.rodando !== "boolean" ||
      typeof dados.ultimoTickEm !== "number"
    ) {
      return null;
    }
    return dados;
  } catch {
    return null;
  }
}

function escreverPersistido(chave: string, dados: EstadoPersistido): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chave, JSON.stringify(dados));
  } catch {
    // Modo privado ou armazenamento cheio.
  }
}

function limparPersistido(chave: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(chave);
  } catch {
    // Ignorar.
  }
}

function calcularEstadoInicial(
  duracaoSegundos: number,
  iniciarAuto: boolean,
  persistirEm?: string,
): EstadoTimer {
  if (persistirEm) {
    const persistido = lerPersistido(persistirEm);
    if (persistido) {
      let restante = persistido.segundosRestantes;
      if (persistido.rodando) {
        const decorrido = Math.floor(
          (Date.now() - persistido.ultimoTickEm) / 1000,
        );
        restante = Math.max(0, restante - decorrido);
      }
      return {
        segundosRestantes: restante,
        rodando: persistido.rodando && restante > 0,
      };
    }
  }
  return {
    segundosRestantes: duracaoSegundos,
    rodando: iniciarAuto,
  };
}

export function useTimer(opcoes: OpcoesTimer): {
  segundosRestantes: number;
  rodando: boolean;
  iniciar: () => void;
  pausar: () => void;
  resetar: () => void;
} {
  const {
    duracaoSegundos,
    iniciar: iniciarAuto = false,
    avisos = [],
    aoTerminar,
    aoAvisar,
    persistirEm,
  } = opcoes;

  const [estadoInicial] = useState(() =>
    calcularEstadoInicial(duracaoSegundos, iniciarAuto, persistirEm),
  );
  const [segundosRestantes, setSegundosRestantes] = useState<number>(
    estadoInicial.segundosRestantes,
  );
  const [rodando, setRodando] = useState<boolean>(estadoInicial.rodando);

  const avisosDisparados = useRef<Set<number>>(new Set());
  const aoTerminarRef = useRef(aoTerminar);
  const aoAvisarRef = useRef(aoAvisar);
  const avisosRef = useRef(avisos);
  const persistirRef = useRef(persistirEm);

  useEffect(() => {
    aoTerminarRef.current = aoTerminar;
  }, [aoTerminar]);

  useEffect(() => {
    aoAvisarRef.current = aoAvisar;
  }, [aoAvisar]);

  useEffect(() => {
    avisosRef.current = avisos;
  }, [avisos]);

  useEffect(() => {
    persistirRef.current = persistirEm;
  }, [persistirEm]);

  useEffect(() => {
    if (!rodando) return;
    const id = window.setInterval(() => {
      setSegundosRestantes((atual) => {
        if (atual <= 0) return 0;
        const proximo = atual - 1;

        for (const limite of avisosRef.current) {
          if (proximo === limite && !avisosDisparados.current.has(limite)) {
            avisosDisparados.current.add(limite);
            aoAvisarRef.current?.(limite);
          }
        }

        if (persistirRef.current) {
          escreverPersistido(persistirRef.current, {
            segundosRestantes: proximo,
            rodando: proximo > 0,
            ultimoTickEm: Date.now(),
          });
        }

        if (proximo === 0) {
          setRodando(false);
          aoTerminarRef.current?.();
        }

        return proximo;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [rodando]);

  const iniciar = useCallback(() => {
    setRodando(true);
    if (persistirRef.current) {
      escreverPersistido(persistirRef.current, {
        segundosRestantes,
        rodando: true,
        ultimoTickEm: Date.now(),
      });
    }
  }, [segundosRestantes]);

  const pausar = useCallback(() => {
    setRodando(false);
    if (persistirRef.current) {
      escreverPersistido(persistirRef.current, {
        segundosRestantes,
        rodando: false,
        ultimoTickEm: Date.now(),
      });
    }
  }, [segundosRestantes]);

  const resetar = useCallback(() => {
    setRodando(false);
    setSegundosRestantes(duracaoSegundos);
    avisosDisparados.current.clear();
    if (persistirRef.current) {
      limparPersistido(persistirRef.current);
    }
  }, [duracaoSegundos]);

  return { segundosRestantes, rodando, iniciar, pausar, resetar };
}
