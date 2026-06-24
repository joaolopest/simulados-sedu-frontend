import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/gestor/simulados/${id}/duplicar`,
      { method: "POST", token, body },
    );
    return NextResponse.json(resp, { status: 201 });
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
