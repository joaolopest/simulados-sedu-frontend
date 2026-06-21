import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapQuestao, type QuestaoBackend } from "@/lib/backend-maps";

interface RespostaBackend {
  simulado: unknown;
  questoes: QuestaoBackend[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  try {
    const resp = await backendFetch<RespostaBackend>(`/gestor/simulados/${id}`, {
      token,
    });
    return NextResponse.json({
      simulado: resp.simulado,
      questoes: (resp.questoes ?? []).map(mapQuestao),
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo invalido." },
      { status: 400 },
    );
  }
  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/gestor/simulados/${id}`,
      { method: "PATCH", token, body },
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  const forcar = new URL(request.url).searchParams.get("forcar") === "true";
  try {
    const resp = await backendFetch<Record<string, unknown>>(
      `/gestor/simulados/${id}`,
      { method: "DELETE", token, query: forcar ? { forcar: "true" } : undefined },
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
