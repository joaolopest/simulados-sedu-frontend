import { NextResponse } from "next/server";
import { mockNotificacoes } from "@/lib/mocks";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
  const { id } = await contexto.params;
  const notif = mockNotificacoes.find((n) => n.id === id);
  if (!notif) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Notificação não encontrada." },
      { status: 404 },
    );
  }

  let patch: { lida?: boolean } = {};
  try {
    patch = (await request.json()) as { lida?: boolean };
  } catch {
    /* corpo vazio = marcar como lida */
  }

  const novoEstado = patch.lida ?? true;
  notif.lida = novoEstado;
  notif.lidaEm = novoEstado ? new Date().toISOString() : undefined;

  return NextResponse.json(notif);
}
