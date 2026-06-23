import { NextResponse } from "next/server";
import { backendFetchRaw, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import {
  materiaParaNome,
  nivelParaNome,
  serieParaNome,
} from "@/lib/backend-maps";

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
    const resp = await backendFetchRaw("/questoes/exportar", {
      token,
      query: {
        formato: url.searchParams.get("formato") ?? "csv",
        limite: url.searchParams.get("limite") ?? undefined,
        escopo: url.searchParams.get("escopo") ?? undefined,
        busca: url.searchParams.get("busca") ?? undefined,
        serie: url.searchParams.getAll("serie").map(serieParaNome),
        materia: url.searchParams.getAll("materia").map(materiaParaNome),
        conteudo: url.searchParams.getAll("conteudo"),
        nivel: url.searchParams.getAll("nivel").map(nivelParaNome),
        status: url.searchParams.getAll("status"),
        adaptacao: url.searchParams.getAll("adaptacao"),
        competencia: url.searchParams.getAll("competencia"),
        escola_id: url.searchParams.getAll("escolaId"),
        criado_por_id: url.searchParams.getAll("criadoPor"),
        com_imagem: url.searchParams.get("comImagem") ?? undefined,
      },
    });

    const headers = new Headers();
    const contentType = resp.headers.get("content-type");
    const disposition = resp.headers.get("content-disposition");
    if (contentType) headers.set("content-type", contentType);
    if (disposition) headers.set("content-disposition", disposition);

    return new NextResponse(await resp.arrayBuffer(), {
      status: resp.status,
      headers,
    });
  } catch (erro) {
    return respostaErro(erro);
  }
}
