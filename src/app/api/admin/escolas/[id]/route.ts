import { NextResponse } from "next/server";
import { mockEscolas, mockTurmas, mockUsuarios } from "@/lib/mocks";
import { registrarAuditoria } from "@/lib/auditoria";
import type { Escola } from "@/types";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
  const { id } = await contexto.params;
  const escola = mockEscolas.find((e) => e.id === id);
  if (!escola) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Escola não encontrada." },
      { status: 404 },
    );
  }
  const gestores = mockUsuarios.filter(
    (u) => u.perfil === "gestor" && escola.gestorIds.includes(u.id),
  );
  return NextResponse.json({ ...escola, gestores });
}

export async function PATCH(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  const { id } = await contexto.params;
  const original = mockEscolas.find((e) => e.id === id);
  if (!original) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Escola não encontrada." },
      { status: 404 },
    );
  }

  let patch: Partial<Escola>;
  try {
    patch = (await request.json()) as Partial<Escola>;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo inválido." },
      { status: 400 },
    );
  }

  Object.assign(original, patch, {
    id: original.id,
    atualizadaEm: new Date().toISOString(),
  });

  registrarAuditoria({
    tipo: "editar_escola",
    usuarioId: "usu_001",
    usuarioNome: "Renata Albuquerque Cardoso",
    alvoTipo: "escola",
    alvoId: original.id,
    detalhes: `Editou escola ${original.nome}`,
  });

  return NextResponse.json(original);
}

export async function DELETE(
  _request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
  const { id } = await contexto.params;
  const indice = mockEscolas.findIndex((e) => e.id === id);
  if (indice < 0) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Escola não encontrada." },
      { status: 404 },
    );
  }

  // bloqueia exclusão se há vínculos ativos
  const turmasVinculadas = mockTurmas.filter((t) => t.escolaId === id).length;
  if (turmasVinculadas > 0) {
    return NextResponse.json(
      {
        codigo: "ESCOLA_COM_VINCULOS",
        mensagem: `Esta escola tem ${turmasVinculadas} turma(s) vinculada(s). Remova ou transfira as turmas antes de excluir.`,
      },
      { status: 409 },
    );
  }
  const usuariosVinculados = mockUsuarios.filter(
    (u) => u.escolaId === id,
  ).length;
  if (usuariosVinculados > 0) {
    return NextResponse.json(
      {
        codigo: "ESCOLA_COM_VINCULOS",
        mensagem: `Esta escola tem ${usuariosVinculados} usuário(s) vinculado(s). Transfira ou desative-os antes de excluir.`,
      },
      { status: 409 },
    );
  }

  const removida = mockEscolas.splice(indice, 1)[0];

  registrarAuditoria({
    tipo: "remover_escola",
    usuarioId: "usu_001",
    usuarioNome: "Renata Albuquerque Cardoso",
    alvoTipo: "escola",
    alvoId: id,
    detalhes: `Excluiu escola ${removida.nome} (INEP ${removida.codigoInep})`,
  });

  return NextResponse.json({ id, removida: true });
}
