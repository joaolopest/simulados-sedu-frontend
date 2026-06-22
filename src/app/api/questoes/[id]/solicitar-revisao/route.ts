import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

// Professor/gestor pedem revisão (excluir ou editar questão alheia).
// O backend notifica os admins + registra auditoria.
export async function POST(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;

  let body: { tipo?: string; motivo?: string; proposta?: Record<string, unknown> };
  try {
    body = (await request.json()) as {
      tipo?: string;
      motivo?: string;
      proposta?: Record<string, unknown>;
    };
  } catch {
    body = {};
  }

  try {
    const resp = await backendFetch<{
      ok: boolean;
      tipo: string;
      notificados: number;
    }>(`/questoes/${id}/solicitar-revisao`, {
      method: "POST",
      token,
      body: {
        tipo: body.tipo ?? "edicao",
        motivo: body.motivo ?? null,
        proposta: body.proposta ?? null,
      },
    });
    return NextResponse.json(resp, { status: 201 });
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
