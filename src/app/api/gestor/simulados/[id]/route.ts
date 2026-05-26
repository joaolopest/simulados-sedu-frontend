import { NextResponse } from "next/server";
import { mockSimulados, mockQuestoes } from "@/lib/mocks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));

  const simulado = mockSimulados.find((s) => s.id === id);
  if (!simulado) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Simulado não encontrado." },
      { status: 404 },
    );
  }

  const questoes = (simulado.questaoIds ?? [])
    .map((qid) => mockQuestoes.find((q) => q.id === qid))
    .filter((q): q is NonNullable<typeof q> => q !== undefined);

  return NextResponse.json({ simulado, questoes });
}
