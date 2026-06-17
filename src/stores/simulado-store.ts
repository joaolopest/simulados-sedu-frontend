"use client";

import { create } from "zustand";
import type { RespostaQuestao, Simulado } from "@/types";

function respostasPorQuestao(
  respostas: RespostaQuestao[],
): Record<string, RespostaQuestao> {
  return Object.fromEntries(
    respostas.map((resposta) => [resposta.questaoId, resposta]),
  );
}

export interface EstadoSimulado {
  simuladoAtual: Simulado | null;
  questaoAtualIndice: number;
  respostas: Record<string, RespostaQuestao>;
  iniciadoEm: string | null;
  modoFoco: boolean;

  iniciarSimulado: (
    simulado: Simulado,
    respostasIniciais?: RespostaQuestao[],
  ) => void;
  responderQuestao: (questaoId: string, alternativaId: string) => void;
  marcarRevisao: (questaoId: string) => void;
  proximaQuestao: () => void;
  questaoAnterior: () => void;
  irParaQuestao: (indice: number) => void;
  alternarModoFoco: () => void;
  finalizarSimulado: () => void;
  limpar: () => void;
}

const ESTADO_INICIAL = {
  simuladoAtual: null as Simulado | null,
  questaoAtualIndice: 0,
  respostas: {} as Record<string, RespostaQuestao>,
  iniciadoEm: null as string | null,
  modoFoco: false,
};

export const useSimuladoStore = create<EstadoSimulado>()((set, get) => ({
  ...ESTADO_INICIAL,

  iniciarSimulado: (simulado, respostasIniciais = []) => {
    set({
      simuladoAtual: simulado,
      questaoAtualIndice: 0,
      respostas: respostasPorQuestao(respostasIniciais),
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
    set({ ...ESTADO_INICIAL });
  },
}));
