import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapNotificacao, type NotificacaoBackend } from "@/lib/backend-maps";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;

  let patch: { lida?: boolean } = {};
  try {
    patch = (await request.json()) as { lida?: boolean };
  } catch {
    /* corpo vazio = marcar como lida */
  }

  try {
    const py = await backendFetch<NotificacaoBackend>(`/notificacoes/${id}`, {
      method: "PATCH",
      token,
      body: { lida: patch.lida ?? true },
    });
    return NextResponse.json(mapNotificacao(py));
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
