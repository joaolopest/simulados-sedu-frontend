import { NextResponse } from "next/server";
import type { ResultadoImportacao, ItemRejeitado } from "@/types";

interface CorpoImportacao {
  arquivoNome?: string;
  totalLinhas?: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  // simula 2-4s de processamento
  await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));

  let corpo: CorpoImportacao = {};
  try {
    corpo = (await request.json()) as CorpoImportacao;
  } catch {
    // continua com mock genérico
  }

  const totalLinhas = corpo.totalLinhas ?? 60;
  // simula 8-15% de rejeição
  const numRejeitadas = Math.floor(totalLinhas * (0.08 + Math.random() * 0.07));
  const importadas = totalLinhas - numRejeitadas;

  const motivosPossiveis = [
    "Enunciado vazio",
    "Apenas 3 alternativas — esperado 4",
    "Mais de uma alternativa marcada como correta",
    "Série inválida (esperado: 1_fundamental até 3_medio)",
    "Matéria não cadastrada",
    "Nível inválido (esperado: facil, medio ou dificil)",
    "Imagem com URL malformada",
    "Conteúdo BNCC não reconhecido",
    "Tempo estimado fora do intervalo (10-300s)",
  ];

  const camposPossiveis = [
    "enunciado",
    "alternativas",
    "alternativas[2].correta",
    "serie",
    "materia",
    "nivel",
    "imagemUrl",
    "competencias[0]",
    "tempoEstimadoSegundos",
  ];

  const rejeitadas: ItemRejeitado[] = Array.from(
    { length: numRejeitadas },
    (_, i) => ({
      linha: Math.floor(Math.random() * totalLinhas) + 1,
      campo:
        camposPossiveis[Math.floor(Math.random() * camposPossiveis.length)],
      motivo:
        motivosPossiveis[Math.floor(Math.random() * motivosPossiveis.length)],
      valor: i % 3 === 0 ? null : `valor_${i}`,
    }),
  ).sort((a, b) => a.linha - b.linha);

  const resultado: ResultadoImportacao = {
    totalLinhas,
    importadas,
    rejeitadas,
    iniciadoEm: new Date(Date.now() - 3000).toISOString(),
    finalizadoEm: new Date().toISOString(),
  };

  return NextResponse.json(resultado);
}
