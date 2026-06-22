import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chave: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { chave } = await params;
  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/configuracoes/${encodeURIComponent(chave)}`,
      { token },
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chave: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { chave } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/configuracoes/${encodeURIComponent(chave)}`,
      { method: "PATCH", token, body },
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
