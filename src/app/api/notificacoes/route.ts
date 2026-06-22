import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapNotificacao, type NotificacaoBackend } from "@/lib/backend-maps";

interface ListaBackend {
  total: number;
  nao_lidas: number;
  dados: NotificacaoBackend[];
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  if (!token) {
    return NextResponse.json(
      { codigo: "NAO_AUTENTICADO", mensagem: "Token ausente." },
      { status: 401 },
    );
  }
  try {
    // O backend devolve as notificações do próprio usuário (pelo token).
    const resp = await backendFetch<ListaBackend>("/notificacoes", { token });
    return NextResponse.json({
      total: resp.total,
      naoLidas: resp.nao_lidas,
      dados: resp.dados.map(mapNotificacao),
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

export async function PATCH(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  if (!token) {
    return NextResponse.json(
      { codigo: "NAO_AUTENTICADO", mensagem: "Token ausente." },
      { status: 401 },
    );
  }

  let body: { lida?: boolean } = {};
  try {
    body = (await request.json()) as { lida?: boolean };
  } catch {
    body = {};
  }

  try {
    const resp = await backendFetch<Record<string, unknown>>("/notificacoes", {
      method: "PATCH",
      token,
      body: { lida: body.lida ?? true },
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
