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
      `/simulados/${id}/inscricoes`,
      { token },
    );
    return NextResponse.json(resp);
  } catch (erro) {
    return respostaErro(erro);
  }
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
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }
  const dados = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const payload = {
    aluno_id: dados.aluno_id ?? dados.alunoId,
  };

  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/simulados/${id}/inscricoes`,
      { method: "POST", token, body: payload },
    );
    return NextResponse.json(resp, { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
