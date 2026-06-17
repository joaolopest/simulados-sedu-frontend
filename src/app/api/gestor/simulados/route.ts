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

export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const url = new URL(request.url);
  try {
    const resp = await backendFetch<Record<string, unknown>>("/gestor/simulados", {
      token,
      query: {
        status: url.searchParams.get("status") ?? undefined,
        busca: url.searchParams.get("busca") ?? undefined,
      },
    });
    return NextResponse.json(resp);
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  let parametros: unknown;
  try {
    parametros = await request.json();
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo inválido." },
      { status: 400 },
    );
  }
  try {
    const criado = await backendFetch<Record<string, unknown>>(
      "/gestor/simulados",
      { method: "POST", token, body: parametros },
    );
    return NextResponse.json(criado, { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
