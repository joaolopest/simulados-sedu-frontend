import { NextResponse } from "next/server";
import {
  mockQuestoes,
  mockEscolas,
  mockSimulados,
  mockUsuarios,
  mockInsights,
} from "@/lib/mocks";

export async function GET(): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  const totalQuestoes = mockQuestoes.length;
  const totalEscolas = mockEscolas.filter((e) => e.ativa).length;
  const simuladosNoMes = mockSimulados.filter((s) => {
    const data = new Date(s.criadoEm);
    const agora = new Date();
    return (
      data.getMonth() === agora.getMonth() &&
      data.getFullYear() === agora.getFullYear()
    );
  }).length;
  const alunosEmRisco = Math.floor(mockUsuarios.filter((u) => u.perfil === "aluno").length * 0.18);

  // série semanal — 12 semanas
  const tendenciaSemanal = Array.from({ length: 12 }, (_, i) => ({
    semana: `S${i + 1}`,
    questoes: 50 + Math.floor(Math.random() * 30) + i * 5,
    simulados: 2 + Math.floor(Math.random() * 4),
    importacoes: Math.floor(Math.random() * 3),
  }));

  // top 10 escolas por uso
  const topEscolas = mockEscolas.slice(0, 10).map((e) => ({
    escola: e,
    simuladosAplicados: 8 + Math.floor(Math.random() * 25),
    totalAlunos: e.totalAlunos,
    taxaParticipacao: 0.65 + Math.random() * 0.3,
  })).sort((a, b) => b.simuladosAplicados - a.simuladosAplicados);

  return NextResponse.json({
    kpis: {
      totalQuestoes,
      totalEscolas,
      simuladosNoMes,
      alunosEmRisco,
      deltaQuestoes: 12,
      deltaEscolas: 2,
      deltaSimulados: 8,
      deltaRisco: -3,
    },
    tendenciaSemanal,
    topEscolas,
    insights: mockInsights.slice(0, 3),
  });
}
