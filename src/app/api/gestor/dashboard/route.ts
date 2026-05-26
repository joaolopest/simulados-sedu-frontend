import { NextResponse } from "next/server";
import {
  mockSimulados,
  mockResultados,
  mockUsuarios,
  mockEscolas,
  mockTurmas,
  mockInsights,
} from "@/lib/mocks";

export async function GET(): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  // simulados criados (assume gestor logado é dono de tudo no mock)
  const meusSimulados = mockSimulados.slice(0, 8).map((s) => ({
    ...s,
    // contagens leves pro card
    totalAlunos: 25 + (parseInt(s.id.replace(/\D/g, "")) % 30),
  }));

  const totalAlunos = mockUsuarios.filter((u) => u.perfil === "aluno").length;
  const totalEscolas = mockEscolas.length;
  const totalTurmas = mockTurmas.length;

  // média geral das últimas notas
  const ultimasNotas = mockResultados.slice(-30).map((r) => r.notaFinal);
  const mediaGeral =
    ultimasNotas.length > 0
      ? ultimasNotas.reduce((a, b) => a + b, 0) / ultimasNotas.length
      : 0;

  // alunos em alerta (low scores ou com adaptações que precisam atenção)
  const alunosEmRisco = mockUsuarios
    .filter((u) => u.perfil === "aluno" && (u.adaptacoes?.length ?? 0) > 0)
    .slice(0, 8)
    .map((aluno, i) => ({
      aluno,
      probabilidadeRisco: 0.42 + (i * 0.05) + Math.random() * 0.15,
      tendencia: i % 3 === 0 ? "subindo" : i % 3 === 1 ? "estavel" : "caindo",
      ultimaAtualizacao: new Date(
        Date.now() - i * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }))
    .sort((a, b) => b.probabilidadeRisco - a.probabilidadeRisco);

  // gráfico — média por turma (top 6)
  const mediasPorTurma = mockTurmas.slice(0, 6).map((t) => ({
    turmaId: t.id,
    turmaNome: t.nome,
    media: 5 + Math.random() * 4,
  }));

  // série semanal pra trend (12 semanas)
  const tendenciaSemanal = Array.from({ length: 12 }, (_, i) => ({
    semana: `S${i + 1}`,
    media: 5.5 + Math.sin(i / 3) * 1.2 + (Math.random() - 0.5) * 0.5,
    simulados: Math.floor(Math.random() * 8) + 2,
  }));

  return NextResponse.json({
    kpis: {
      totalAlunos,
      totalEscolas,
      totalTurmas,
      simuladosEmAndamento: meusSimulados.filter(
        (s) => s.status === "em_andamento",
      ).length,
      mediaGeral: parseFloat(mediaGeral.toFixed(1)),
      alertasIA: alunosEmRisco.filter((a) => a.probabilidadeRisco >= 0.7).length,
    },
    meusSimulados,
    alunosEmRisco,
    mediasPorTurma,
    tendenciaSemanal,
    insights: mockInsights.slice(0, 3),
  });
}
