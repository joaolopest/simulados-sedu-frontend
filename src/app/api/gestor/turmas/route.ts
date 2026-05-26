import { NextResponse } from "next/server";
import { mockEscolas, mockTurmas, mockUsuarios } from "@/lib/mocks";

export async function GET(): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));

  const escolaPorId = new Map(mockEscolas.map((e) => [e.id, e.nome]));

  const enriquecidas = mockTurmas.map((t) => {
    const alunos = mockUsuarios.filter(
      (u) => u.perfil === "aluno" && t.alunoIds.includes(u.id),
    );
    const comAdaptacao = alunos.filter(
      (a) => (a.adaptacoes?.length ?? 0) > 0,
    );
    return {
      ...t,
      escolaNome: escolaPorId.get(t.escolaId) ?? "Escola desconhecida",
      totalAlunos: alunos.length,
      totalComAdaptacao: comAdaptacao.length,
    };
  });

  return NextResponse.json({ dados: enriquecidas });
}
