"use client";

import { create } from "zustand";
import type {
  FilaRespostaPendente,
  RespostaQuestao,
  Simulado,
} from "@/types";

const CHAVE_FILA_LOCAL = "sedu-fila-respostas";

function carregarFilaPersistida(): FilaRespostaPendente | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const bruto = localStorage.getItem(CHAVE_FILA_LOCAL);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as FilaRespostaPendente;
    if (!dados.simuladoId || !Array.isArray(dados.respostas)) return null;
    return dados;
  } catch {
    return null;
  }
}

function persistirFila(fila: FilaRespostaPendente | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (fila === null) {
      localStorage.removeItem(CHAVE_FILA_LOCAL);
      return;
    }
    localStorage.setItem(CHAVE_FILA_LOCAL, JSON.stringify(fila));
  } catch {
    // Ignorar — pode estar bloqueado em modo privado.
  }
}

export interface EstadoSimulado {
  simuladoAtual: Simulado | null;
  questaoAtualIndice: number;
  respostas: Record<string, RespostaQuestao>;
  iniciadoEm: string | null;
  modoFoco: boolean;
  filaPendente: FilaRespostaPendente | null;

  iniciarSimulado: (simulado: Simulado) => void;
  responderQuestao: (questaoId: string, alternativaId: string) => void;
  marcarRevisao: (questaoId: string) => void;
  proximaQuestao: () => void;
  questaoAnterior: () => void;
  irParaQuestao: (indice: number) => void;
  alternarModoFoco: () => void;
  finalizarSimulado: () => void;
  limpar: () => void;

  obterRespostasDaFila: () => RespostaQuestao[];
  adicionarAFila: (resposta: RespostaQuestao) => void;
  limparFila: () => void;
}

const ESTADO_INICIAL = {
  simuladoAtual: null as Simulado | null,
  questaoAtualIndice: 0,
  respostas: {} as Record<string, RespostaQuestao>,
  iniciadoEm: null as string | null,
  modoFoco: false,
  filaPendente: null as FilaRespostaPendente | null,
};

export const useSimuladoStore = create<EstadoSimulado>()((set, get) => ({
  ...ESTADO_INICIAL,
  filaPendente: carregarFilaPersistida(),

  iniciarSimulado: (simulado) => {
    set({
      simuladoAtual: simulado,
      questaoAtualIndice: 0,
      respostas: {},
      iniciadoEm: new Date().toISOString(),
      modoFoco: false,
    });
  },

  responderQuestao: (questaoId, alternativaId) => {
    const { respostas } = get();
    const anterior = respostas[questaoId];
    const trocas = anterior ? anterior.trocasDeResposta + 1 : 0;
    const tempoAcumulado = anterior?.tempoGastoSegundos ?? 0;
    const nova: RespostaQuestao = {
      questaoId,
      alternativaId,
      status: "respondida",
      tempoGastoSegundos: tempoAcumulado,
      trocasDeResposta: trocas,
      respondidaEm: new Date().toISOString(),
    };
    set({ respostas: { ...respostas, [questaoId]: nova } });
    get().adicionarAFila(nova);
  },

  marcarRevisao: (questaoId) => {
    const { respostas } = get();
    const anterior = respostas[questaoId];
    const base: RespostaQuestao = anterior ?? {
      questaoId,
      status: "em_branco",
      tempoGastoSegundos: 0,
      trocasDeResposta: 0,
    };
    const nova: RespostaQuestao = {
      ...base,
      status:
        base.status === "marcada_revisao"
          ? base.alternativaId
            ? "respondida"
            : "em_branco"
          : "marcada_revisao",
    };
    set({ respostas: { ...respostas, [questaoId]: nova } });
  },

  proximaQuestao: () => {
    const { simuladoAtual, questaoAtualIndice } = get();
    if (!simuladoAtual) return;
    const total = simuladoAtual.questaoIds.length;
    if (questaoAtualIndice < total - 1) {
      set({ questaoAtualIndice: questaoAtualIndice + 1 });
    }
  },

  questaoAnterior: () => {
    const { questaoAtualIndice } = get();
    if (questaoAtualIndice > 0) {
      set({ questaoAtualIndice: questaoAtualIndice - 1 });
    }
  },

  irParaQuestao: (indice) => {
    const { simuladoAtual } = get();
    if (!simuladoAtual) return;
    const total = simuladoAtual.questaoIds.length;
    if (indice < 0 || indice >= total) return;
    set({ questaoAtualIndice: indice });
  },

  alternarModoFoco: () => set((estado) => ({ modoFoco: !estado.modoFoco })),

  finalizarSimulado: () => {
    set({ simuladoAtual: null, modoFoco: false });
  },

  limpar: () => {
    set({ ...ESTADO_INICIAL, filaPendente: null });
    persistirFila(null);
  },

  obterRespostasDaFila: () => get().filaPendente?.respostas ?? [],

  adicionarAFila: (resposta) => {
    const { filaPendente, simuladoAtual } = get();
    if (!simuladoAtual) return;
    const baseAlunoId = filaPendente?.alunoId ?? "";
    const respostasExistentes = filaPendente?.respostas ?? [];
    const filtradas = respostasExistentes.filter(
      (item) => item.questaoId !== resposta.questaoId,
    );
    const novaFila: FilaRespostaPendente = {
      simuladoId: simuladoAtual.id,
      alunoId: baseAlunoId,
      respostas: [...filtradas, resposta],
      ultimoSyncEm: new Date().toISOString(),
    };
    persistirFila(novaFila);
    set({ filaPendente: novaFila });
  },

  limparFila: () => {
    persistirFila(null);
    set({ filaPendente: null });
  },
}));
