import { NextResponse } from "next/server";
import { mockNotificacoes } from "@/lib/mocks";

export async function GET(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
  const url = new URL(request.url);
  const usuarioId = url.searchParams.get("usuarioId");

  let lista = mockNotificacoes;
  if (usuarioId) {
    lista = lista.filter((n) => n.destinatarioId === usuarioId);
  }

  const ordenadas = [...lista].sort((a, b) =>
    b.criadaEm.localeCompare(a.criadaEm),
  );
  const naoLidas = ordenadas.filter((n) => !n.lida).length;

  return NextResponse.json({
    total: ordenadas.length,
    naoLidas,
    dados: ordenadas,
  });
}
