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
    // Silenciar — modo privado ou armazenamento cheio.
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

  const inicialRef = useRef<{
    segundosRestantes: number;
    rodando: boolean;
  } | null>(null);
  if (inicialRef.current === null) {
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
        inicialRef.current = {
          segundosRestantes: restante,
          rodando: persistido.rodando,
        };
      }
    }
    if (inicialRef.current === null) {
      inicialRef.current = {
        segundosRestantes: duracaoSegundos,
        rodando: iniciarAuto,
      };
    }
  }

  const [segundosRestantes, setSegundosRestantes] = useState<number>(
    inicialRef.current.segundosRestantes,
  );
  const [rodando, setRodando] = useState<boolean>(inicialRef.current.rodando);

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

  // Tick por intervalo.
  useEffect(() => {
    if (!rodando) return;
    const id = window.setInterval(() => {
      setSegundosRestantes((atual) => {
        if (atual <= 0) return 0;
        const proximo = atual - 1;

        // Avisos.
        for (const limite of avisosRef.current) {
          if (proximo === limite && !avisosDisparados.current.has(limite)) {
            avisosDisparados.current.add(limite);
            aoAvisarRef.current?.(limite);
          }
        }

        // Persistir.
        if (persistirRef.current) {
          escreverPersistido(persistirRef.current, {
            segundosRestantes: proximo,
            rodando: true,
            ultimoTickEm: Date.now(),
          });
        }

        if (proximo === 0) {
          aoTerminarRef.current?.();
        }
        return proximo;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [rodando]);

  // Quando atinge zero, parar.
  useEffect(() => {
    if (segundosRestantes === 0 && rodando) {
      setRodando(false);
      if (persistirRef.current) {
        escreverPersistido(persistirRef.current, {
          segundosRestantes: 0,
          rodando: false,
          ultimoTickEm: Date.now(),
        });
      }
    }
  }, [segundosRestantes, rodando]);

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
