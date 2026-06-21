import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapQuestao, type QuestaoBackend } from "@/lib/backend-maps";

interface RespostaBackend {
  simulado: unknown;
  questoes: QuestaoBackend[];
  respostas?: unknown[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  try {
    const resp = await backendFetch<RespostaBackend>(`/aluno/simulado/${id}`, {
      token,
    });
    return NextResponse.json({
      simulado: resp.simulado,
      questoes: (resp.questoes ?? []).map(mapQuestao),
      respostas: resp.respostas ?? [],
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
