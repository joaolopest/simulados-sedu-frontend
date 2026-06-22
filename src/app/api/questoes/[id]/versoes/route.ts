import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;

  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/questoes/${id}/versoes`,
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
