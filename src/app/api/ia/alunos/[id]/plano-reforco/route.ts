import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

function respostaErro(erro: unknown): NextResponse {
  if (erro instanceof ErroBackend) {
    return NextResponse.json(erro.corpo, { status: erro.status });
  }
  return NextResponse.json(
    { codigo: "ERRO_DESCONHECIDO", mensagem: "Erro inesperado." },
    { status: 500 },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;

  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/ia/alunos/${id}/plano-reforco`,
      { token },
    );
    return NextResponse.json(resp);
  } catch (erro) {
    return respostaErro(erro);
  }
}
