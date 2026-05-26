import { NextResponse } from "next/server";
import { mockAuditoria, mockUsuarios } from "@/lib/mocks";

export async function GET(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  const url = new URL(request.url);
  const tipo = url.searchParams.getAll("tipo");
  const usuarioId = url.searchParams.get("usuarioId");
  const desde = url.searchParams.get("desde");
  const ate = url.searchParams.get("ate");
  const pagina = parseInt(url.searchParams.get("pagina") ?? "1", 10);
  const porPagina = parseInt(url.searchParams.get("porPagina") ?? "30", 10);

  let lista = [...mockAuditoria].sort(
    (a, b) =>
      new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime(),
  );

  if (tipo.length) lista = lista.filter((a) => tipo.includes(a.tipo));
  if (usuarioId) lista = lista.filter((a) => a.usuarioId === usuarioId);
  if (desde) {
    const t = new Date(desde).getTime();
    lista = lista.filter((a) => new Date(a.ocorridoEm).getTime() >= t);
  }
  if (ate) {
    const t = new Date(ate).getTime();
    lista = lista.filter((a) => new Date(a.ocorridoEm).getTime() <= t);
  }

  const enriquecidas = lista.map((a) => {
    const usuario = mockUsuarios.find((u) => u.id === a.usuarioId);
    return {
      ...a,
      usuario: usuario
        ? { id: usuario.id, nome: usuario.nome, fotoUrl: usuario.fotoUrl }
        : null,
    };
  });

  const total = enriquecidas.length;
  const inicio = (pagina - 1) * porPagina;
  const dados = enriquecidas.slice(inicio, inicio + porPagina);

  return NextResponse.json({
    dados,
    meta: {
      pagina,
      porPagina,
      total,
      totalPaginas: Math.ceil(total / porPagina),
    },
  });
}
