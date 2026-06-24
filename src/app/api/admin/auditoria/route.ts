import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapAuditoria, type AuditoriaBackend } from "@/lib/backend-maps";

interface ListaBackend {
  total: number;
  pagina: number;
  por_pagina: number;
  dados: AuditoriaBackend[];
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const url = new URL(request.url);
  const pagina = url.searchParams.get("pagina") ?? "1";
  const porPagina = url.searchParams.get("porPagina") ?? "30";
  const usuarioId = url.searchParams.get("usuarioId");
  const alvoId = url.searchParams.get("alvoId");

  try {
    const resp = await backendFetch<ListaBackend>("/auditoria", {
      token,
      query: {
        tipo: url.searchParams.getAll("tipo"),
        // backend filtra por id int; só repassa se for numérico
        usuario_id: usuarioId && /^\d+$/.test(usuarioId) ? usuarioId : undefined,
        alvo_tipo: url.searchParams.get("alvoTipo") ?? undefined,
        alvo_id: alvoId ?? undefined,
        busca: url.searchParams.get("busca") ?? undefined,
        desde: url.searchParams.get("desde") ?? undefined,
        ate: url.searchParams.get("ate") ?? undefined,
        pagina,
        por_pagina: porPagina,
      },
    });
    const porPaginaNum = parseInt(porPagina, 10) || 30;
    return NextResponse.json({
      dados: resp.dados.map(mapAuditoria),
      meta: {
        pagina: parseInt(pagina, 10) || 1,
        porPagina: porPaginaNum,
        total: resp.total,
        totalPaginas: Math.max(1, Math.ceil(resp.total / porPaginaNum)),
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
