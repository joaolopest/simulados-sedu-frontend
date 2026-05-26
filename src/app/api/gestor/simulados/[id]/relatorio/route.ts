import { NextResponse } from "next/server";
import {
  mockSimulados,
  mockResultados,
  mockUsuarios,
  mockDiagnosticos,
  mockSugestoesReforco,
} from "@/lib/mocks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  const simulado = mockSimulados.find((s) => s.id === id);
  if (!simulado) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Simulado não encontrado." },
      { status: 404 },
    );
  }

  // resultados deste simulado (ou fallback: pega últimos 25 do mock)
  let resultados = mockResultados.filter((r) => r.simuladoId === id);
  if (resultados.length === 0) {
    resultados = mockResultados.slice(0, 25);
  }

  const notas = resultados.map((r) => r.notaFinal);
  const media =
    notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
  const maior = notas.length > 0 ? Math.max(...notas) : 0;
  const menor = notas.length > 0 ? Math.min(...notas) : 0;
  const taxaConclusao = 0.84 + Math.random() * 0.12;

  // tabela de alunos
  const tabela = resultados.map((r) => {
    const aluno = mockUsuarios.find((u) => u.id === r.alunoId);
    return {
      alunoId: r.alunoId,
      alunoNome: aluno?.nome ?? "Aluno",
      fotoUrl: aluno?.fotoUrl,
      adaptacoes: aluno?.adaptacoes ?? [],
      notaFinal: r.notaFinal,
      acertos: r.acertos,
      erros: r.erros,
      emBranco: r.emBranco,
      tempoTotalSegundos: r.tempoTotalSegundos,
      emRisco: r.notaFinal < 5,
    };
  });

  // agregação por competência
  const competenciasMap = new Map<
    string,
    { total: number; acertos: number; mediaEstadual: number }
  >();
  for (const r of resultados) {
    for (const c of r.desempenhoPorCompetencia) {
      const atual = competenciasMap.get(c.competencia) ?? {
        total: 0,
        acertos: 0,
        mediaEstadual: c.mediaEstadual ?? 0.6,
      };
      atual.total += c.totalQuestoes;
      atual.acertos += c.acertos;
      competenciasMap.set(c.competencia, atual);
    }
  }
  const competencias = Array.from(competenciasMap.entries()).map(
    ([nome, d]) => ({
      competencia: nome,
      taxaAcerto: d.total > 0 ? d.acertos / d.total : 0,
      mediaEstadual: d.mediaEstadual,
      totalQuestoes: d.total,
      acertos: d.acertos,
    }),
  );

  // diagnóstico IA do simulado (com fallback)
  const diagnostico =
    mockDiagnosticos.find((d) => d.simuladoId === id) ?? mockDiagnosticos[0];

  const sugestoes = mockSugestoesReforco.slice(0, 4);

  return NextResponse.json({
    simulado,
    panorama: {
      media: parseFloat(media.toFixed(1)),
      maior: parseFloat(maior.toFixed(1)),
      menor: parseFloat(menor.toFixed(1)),
      taxaConclusao: parseFloat(taxaConclusao.toFixed(2)),
      totalRespostas: resultados.length,
    },
    diagnostico,
    competencias,
    tabela,
    sugestoes,
  });
}
