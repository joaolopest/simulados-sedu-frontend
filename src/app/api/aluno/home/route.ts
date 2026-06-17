import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

// Home do aluno: já vem montada no backend no formato da tela.
export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  try {
    const resp = await backendFetch<Record<string, unknown>>("/aluno/home", {
      token,
    });
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
