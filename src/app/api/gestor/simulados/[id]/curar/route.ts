import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapQuestao, type QuestaoBackend } from "@/lib/backend-maps";

interface RespostaBackend {
  curadoria: unknown;
  questoesSelecionadas: QuestaoBackend[];
  questaoIds: string[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo inválido." },
      { status: 400 },
    );
  }
  try {
    const resp = await backendFetch<RespostaBackend>(
      `/gestor/simulados/${id}/curar`,
      { method: "POST", token, body },
    );
    return NextResponse.json({
      curadoria: resp.curadoria,
      questoesSelecionadas: (resp.questoesSelecionadas ?? []).map(mapQuestao),
      questaoIds: resp.questaoIds,
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
