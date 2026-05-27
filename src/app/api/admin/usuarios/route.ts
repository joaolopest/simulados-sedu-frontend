import { NextResponse } from "next/server";
import { mockUsuarios, mockEscolas } from "@/lib/mocks";
import { registrarAuditoria } from "@/lib/auditoria";
import type { PerfilUsuario, Usuario } from "@/types";

export async function GET(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  const url = new URL(request.url);
  const busca = url.searchParams.get("busca")?.toLowerCase() ?? "";
  const perfis = url.searchParams.getAll("perfil") as PerfilUsuario[];
  const escolaId = url.searchParams.get("escolaId");
  const apenasAtivos = url.searchParams.get("ativos") === "true";
  const pagina = parseInt(url.searchParams.get("pagina") ?? "1", 10);
  const porPagina = parseInt(url.searchParams.get("porPagina") ?? "30", 10);

  let lista: Usuario[] = mockUsuarios;
  if (busca) {
    lista = lista.filter(
      (u) =>
        u.nome.toLowerCase().includes(busca) ||
        u.email.toLowerCase().includes(busca),
    );
  }
  if (perfis.length) lista = lista.filter((u) => perfis.includes(u.perfil));
  if (escolaId) lista = lista.filter((u) => u.escolaId === escolaId);
  if (apenasAtivos) lista = lista.filter((u) => u.ativo);

  const total = lista.length;
  const inicio = (pagina - 1) * porPagina;
  const dados = lista.slice(inicio, inicio + porPagina).map((u) => ({
    ...u,
    escola: u.escolaId
      ? mockEscolas.find((e) => e.id === u.escolaId)?.nome
      : null,
  }));

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

export async function POST(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
  const body = (await request.json()) as Partial<Usuario>;

  if (body.email) {
    const emailNorm = body.email.toLowerCase();
    if (mockUsuarios.some((u) => u.email.toLowerCase() === emailNorm)) {
      return NextResponse.json(
        {
          codigo: "EMAIL_DUPLICADO",
          mensagem: "Já existe um usuário com este email.",
        },
        { status: 409 },
      );
    }
  }

  const novo: Usuario = {
    ...body,
    id: `usu_${Date.now().toString(36)}`,
    ativo: true,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  } as Usuario;

  mockUsuarios.push(novo);

  registrarAuditoria({
    tipo: "criar_usuario",
    usuarioId: "usu_001",
    usuarioNome: "Renata Albuquerque Cardoso",
    alvoTipo: "usuario",
    alvoId: novo.id,
    detalhes: `Cadastrou ${novo.nome} (${novo.perfil}) - ${novo.email}`,
  });

  return NextResponse.json(
    {
      ...novo,
      escola: novo.escolaId
        ? mockEscolas.find((e) => e.id === novo.escolaId)?.nome
        : null,
    },
    { status: 201 },
  );
}
