import { NextResponse } from "next/server";
import { mockEscolas, mockUsuarios } from "@/lib/mocks";

export async function GET(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  const url = new URL(request.url);
  const busca = url.searchParams.get("busca")?.toLowerCase() ?? "";
  const apenasAtivas = url.searchParams.get("ativas") === "true";

  let lista = mockEscolas;
  if (busca) {
    lista = lista.filter(
      (e) =>
        e.nome.toLowerCase().includes(busca) ||
        e.municipio.toLowerCase().includes(busca) ||
        e.codigoInep.includes(busca),
    );
  }
  if (apenasAtivas) {
    lista = lista.filter((e) => e.ativa);
  }

  const enriquecidas = lista.map((e) => {
    const gestores = mockUsuarios.filter(
      (u) => u.perfil === "gestor" && e.gestorIds.includes(u.id),
    );
    return { ...e, gestores };
  });

  return NextResponse.json({ dados: enriquecidas });
}
