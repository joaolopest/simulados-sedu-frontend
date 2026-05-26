"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type EstadoAutosave = "ocioso" | "salvando" | "salvo" | "erro";

interface OpcoesAutosave<T> {
  valor: T;
  aoSalvar: (valor: T) => Promise<void>;
  debounceMs?: number;
  habilitado?: boolean;
}

export function useAutosave<T>(opcoes: OpcoesAutosave<T>): {
  estado: EstadoAutosave;
  ultimoSalvoEm: Date | null;
  salvarAgora: () => Promise<void>;
} {
  const { valor, aoSalvar, debounceMs = 500, habilitado = true } = opcoes;

  const [estado, setEstado] = useState<EstadoAutosave>("ocioso");
  const [ultimoSalvoEm, setUltimoSalvoEm] = useState<Date | null>(null);

  const valorRef = useRef<T>(valor);
  const aoSalvarRef = useRef(aoSalvar);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valorJaSalvoRef = useRef<T>(valor);
  const primeiraExecucaoRef = useRef<boolean>(true);

  useEffect(() => {
    valorRef.current = valor;
  }, [valor]);

  useEffect(() => {
    aoSalvarRef.current = aoSalvar;
  }, [aoSalvar]);

  const executarSalvamento = useCallback(async (): Promise<void> => {
    const valorAtual = valorRef.current;
    setEstado("salvando");
    try {
      await aoSalvarRef.current(valorAtual);
      valorJaSalvoRef.current = valorAtual;
      setUltimoSalvoEm(new Date());
      setEstado("salvo");
    } catch {
      setEstado("erro");
    }
  }, []);

  const salvarAgora = useCallback(async (): Promise<void> => {
    if (temporizadorRef.current !== null) {
      clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
    await executarSalvamento();
  }, [executarSalvamento]);

  useEffect(() => {
    if (!habilitado) return;

    // Não salvar na primeira renderização — o valor inicial não é uma mudança.
    if (primeiraExecucaoRef.current) {
      primeiraExecucaoRef.current = false;
      valorJaSalvoRef.current = valor;
      return;
    }

    if (Object.is(valor, valorJaSalvoRef.current)) return;

    if (temporizadorRef.current !== null) {
      clearTimeout(temporizadorRef.current);
    }
    temporizadorRef.current = setTimeout(() => {
      temporizadorRef.current = null;
      void executarSalvamento();
    }, debounceMs);

    return () => {
      if (temporizadorRef.current !== null) {
        clearTimeout(temporizadorRef.current);
        temporizadorRef.current = null;
      }
    };
  }, [valor, debounceMs, habilitado, executarSalvamento]);

  return { estado, ultimoSalvoEm, salvarAgora };
}
