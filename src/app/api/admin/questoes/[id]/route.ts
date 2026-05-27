import { NextResponse } from "next/server";
import { mockQuestoes } from "@/lib/mocks";
import { registrarAuditoria } from "@/lib/auditoria";
import type { Questao } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
  const questao = mockQuestoes.find((q) => q.id === id);
  if (!questao) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Questão não encontrada." },
      { status: 404 },
    );
  }
  return NextResponse.json(questao);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
  const body = (await request.json()) as Partial<Questao>;
  const existente = mockQuestoes.find((q) => q.id === id);
  if (!existente) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Questão não encontrada." },
      { status: 404 },
    );
  }
  // muta in-place pra persistir entre requisições
  const statusAntes = existente.status;
  Object.assign(existente, body, {
    id: existente.id,
    atualizadoEm: new Date().toISOString(),
    versao: existente.versao + 1,
  });

  if (body.status && body.status !== statusAntes) {
    registrarAuditoria({
      tipo: body.status === "publicada" ? "publicar_questao" : "editar_questao",
      usuarioId: "usu_001",
      usuarioNome: "Renata Albuquerque Cardoso",
      alvoTipo: "questao",
      alvoId: existente.id,
      detalhes: `Alterou status para ${body.status}`,
    });
  } else {
    registrarAuditoria({
      tipo: "editar_questao",
      usuarioId: "usu_001",
      usuarioNome: "Renata Albuquerque Cardoso",
      alvoTipo: "questao",
      alvoId: existente.id,
      detalhes: `Editou questão de ${existente.materia}`,
    });
  }

  return NextResponse.json(existente);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
  const indice = mockQuestoes.findIndex((q) => q.id === id);
  if (indice < 0) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Questão não encontrada." },
      { status: 404 },
    );
  }
  const removida = mockQuestoes.splice(indice, 1)[0];
  registrarAuditoria({
    tipo: "editar_questao",
    usuarioId: "usu_001",
    usuarioNome: "Renata Albuquerque Cardoso",
    alvoTipo: "questao",
    alvoId: id,
    detalhes: `Removeu questão de ${removida.materia} (${removida.nivel})`,
  });
  return NextResponse.json({ id, deletada: true });
}
