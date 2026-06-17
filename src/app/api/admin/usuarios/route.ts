import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapUsuario, type UsuarioBackend } from "@/lib/backend-maps";

function comEscola(py: UsuarioBackend) {
  return { ...mapUsuario(py), escola: py.escola_nome ?? null };
}

function respostaErro(erro: unknown): NextResponse {
  if (erro instanceof ErroBackend) {
    return NextResponse.json(erro.corpo, { status: erro.status });
  }
  return NextResponse.json(
    { codigo: "ERRO_DESCONHECIDO", mensagem: "Erro inesperado." },
    { status: 500 },
  );
}

interface ListaBackend {
  total: number;
  pagina: number;
  por_pagina: number;
  dados: UsuarioBackend[];
}

function payloadUsuario(body: Record<string, unknown>): Record<string, unknown> {
  const { escolaId, ...resto } = body;
  return {
    ...resto,
    escola_id:
      typeof escolaId === "string" && escolaId.length > 0
        ? Number(escolaId)
        : undefined,
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const url = new URL(request.url);

  const perfil = url.searchParams.getAll("perfil");
  const pagina = url.searchParams.get("pagina") ?? "1";
  const porPagina = url.searchParams.get("porPagina") ?? "30";

  try {
    const resp = await backendFetch<ListaBackend>("/usuarios", {
      token,
      query: {
        busca: url.searchParams.get("busca") ?? undefined,
        perfil: perfil.length ? perfil : undefined,
        ativo: url.searchParams.get("ativos") === "true" ? true : undefined,
        escola_id: url.searchParams.get("escolaId") ?? undefined,
        pagina,
        por_pagina: porPagina,
      },
    });

    const porPaginaNum = parseInt(porPagina, 10) || 30;
    return NextResponse.json({
      dados: resp.dados.map(comEscola),
      meta: {
        pagina: parseInt(pagina, 10) || 1,
        porPagina: porPaginaNum,
        total: resp.total,
        totalPaginas: Math.max(1, Math.ceil(resp.total / porPaginaNum)),
      },
    });
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  try {
    const py = await backendFetch<UsuarioBackend>("/usuarios", {
      method: "POST",
      token,
      body: payloadUsuario(body),
    });
    const criado = comEscola(py);

    return NextResponse.json(criado, { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
