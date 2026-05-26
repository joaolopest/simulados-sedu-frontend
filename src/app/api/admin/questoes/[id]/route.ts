import { NextResponse } from "next/server";
import { mockQuestoes } from "@/lib/mocks";
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
  const atualizada: Questao = {
    ...existente,
    ...body,
    id: existente.id,
    atualizadoEm: new Date().toISOString(),
    versao: existente.versao + 1,
  };
  return NextResponse.json(atualizada);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
  return NextResponse.json({ id, deletada: true });
}
