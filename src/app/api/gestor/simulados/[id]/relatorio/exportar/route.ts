import { NextResponse } from "next/server";
import {
  backendFetchRaw,
  ErroBackend,
  tokenDaRequisicao,
} from "@/lib/backend";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  const url = new URL(request.url);

  try {
    const resp = await backendFetchRaw(
      `/gestor/simulados/${id}/relatorio/exportar`,
      {
        token,
        query: {
          formato: url.searchParams.get("formato") ?? "csv",
          secao: url.searchParams.get("secao") ?? "tabela",
        },
      },
    );
    const corpo = await resp.arrayBuffer();
    return new Response(corpo, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("Content-Type") ?? "text/csv; charset=utf-8",
        "Content-Disposition":
          resp.headers.get("Content-Disposition") ??
          `attachment; filename="relatorio-simulado-${id}.csv"`,
      },
    });
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
