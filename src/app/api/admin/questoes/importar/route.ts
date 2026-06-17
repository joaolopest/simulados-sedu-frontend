import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

export async function POST(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* corpo opcional */
  }
  try {
    const resp = await backendFetch<Record<string, unknown>>(
      "/admin/questoes/importar",
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
