import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

// Agregação montada no backend já no formato da tela — só repassamos.
export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  try {
    const resp = await backendFetch<Record<string, unknown>>("/admin/dashboard", {
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
