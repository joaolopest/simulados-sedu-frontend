import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; alunoId: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id, alunoId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }
  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/gestor/simulados/${id}/alunos/${alunoId}/reabrir`,
      { method: "POST", token, body },
    );
    return NextResponse.json(resp);
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
