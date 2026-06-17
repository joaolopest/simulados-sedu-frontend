import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapQuestao, type QuestaoBackend } from "@/lib/backend-maps";

interface RespostaBackend {
  simulado: unknown;
  resultado: unknown;
  questoes: QuestaoBackend[];
  diagnostico: unknown;
  mensagem: unknown;
  sugestoes: unknown[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  try {
    const resp = await backendFetch<RespostaBackend>(
      `/aluno/simulado/${id}/resultado`,
      { token },
    );
    return NextResponse.json({
      simulado: resp.simulado,
      resultado: resp.resultado,
      questoes: (resp.questoes ?? []).map(mapQuestao),
      diagnostico: resp.diagnostico,
      mensagem: resp.mensagem,
      sugestoes: resp.sugestoes ?? [],
    });
  } catch (erro) {
    if (erro instanceof ErroBackend) {
      return NextResponse.json(erro.corpo, { status: erro.status });
    }
    return NextResponse.json(
      { codigo: "ERRO_DESCONHECIDO", mensagem: "Erro inesperado." },
      { status: 500 },
    );
  }
}
