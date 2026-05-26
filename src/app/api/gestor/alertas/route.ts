import { NextResponse } from "next/server";
import {
  mockUsuarios,
  mockTurmas,
  mockResultados,
} from "@/lib/mocks";

export async function GET(): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  const alunos = mockUsuarios.filter((u) => u.perfil === "aluno");

  // gera previsões de risco mock
  const alertas = alunos
    .slice(0, 25)
    .map((aluno, i) => {
      const turma = mockTurmas.find((t) => t.id === aluno.turmaIds?.[0]);
      const meusResultados = mockResultados.filter(
        (r) => r.alunoId === aluno.id,
      );
      const ultimaNota =
        meusResultados[meusResultados.length - 1]?.notaFinal ?? 5;

      // probabilidade baseada em adaptações + nota baixa
      const temAdaptacao = (aluno.adaptacoes?.length ?? 0) > 0;
      const baseRisco = temAdaptacao ? 0.5 : 0.3;
      const ajusteNota = Math.max(0, (6 - ultimaNota) / 10);
      const prob = Math.min(0.95, baseRisco + ajusteNota + Math.random() * 0.15);

      const tendencia: "subindo" | "estavel" | "caindo" =
        i % 3 === 0 ? "subindo" : i % 3 === 1 ? "estavel" : "caindo";

      const competenciasFracas =
        meusResultados[meusResultados.length - 1]?.desempenhoPorCompetencia
          .filter((c) => c.taxaAcerto < 0.5)
          .map((c) => c.competencia)
          .slice(0, 3) ?? [];

      return {
        aluno,
        turmaNome: turma?.nome ?? "—",
        probabilidadeRisco: parseFloat(prob.toFixed(2)),
        tendencia,
        ultimaAtualizacao: new Date(
          Date.now() - i * 6 * 60 * 60 * 1000,
        ).toISOString(),
        ultimaNota,
        competenciasFracas,
      };
    })
    .sort((a, b) => b.probabilidadeRisco - a.probabilidadeRisco);

  // agregações
  const contagens = {
    alta: alertas.filter((a) => a.probabilidadeRisco >= 0.7).length,
    media: alertas.filter(
      (a) => a.probabilidadeRisco >= 0.4 && a.probabilidadeRisco < 0.7,
    ).length,
    baixa: alertas.filter((a) => a.probabilidadeRisco < 0.4).length,
    total: alertas.length,
  };

  return NextResponse.json({
    dados: alertas,
    contagens,
  });
}
