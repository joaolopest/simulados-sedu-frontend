import { NextResponse } from "next/server";
import { backendFetch, ErroBackend } from "@/lib/backend";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* corpo opcional */
  }
  try {
    const resp = await backendFetch<Record<string, unknown>>(
      "/auth/recuperar-senha",
      { method: "POST", body },
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
