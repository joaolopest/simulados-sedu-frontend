import { NextResponse } from "next/server";
import { mockSimulados, mockUsuarios, mockTurmas } from "@/lib/mocks";
import type { StatusAlunoSimulado } from "@/types";

interface AlunoAcompanhamento {
  alunoId: string;
  nome: string;
  fotoUrl?: string;
  status: StatusAlunoSimulado;
  questaoAtualIndice: number;
  totalQuestoes: number;
  tempoRestanteSegundos: number;
  conexaoOk: boolean;
  ultimaAtividadeEm: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

  const simulado = mockSimulados.find((s) => s.id === id);
  if (!simulado) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Simulado não encontrado." },
      { status: 404 },
    );
  }

  const turma = mockTurmas.find((t) => t.id === simulado.parametros.turmaId);
  const alunoIds = turma?.alunoIds ?? [];
  const totalQuestoes = simulado.parametros.quantidadeQuestoes;

  // semente: muda a cada 5s pra parecer ao vivo
  const semente = Math.floor(Date.now() / 5000) % 100;

  const alunos: AlunoAcompanhamento[] = alunoIds.slice(0, 30).map((aId, i) => {
    const aluno = mockUsuarios.find((u) => u.id === aId);
    const offset = (semente + i * 7) % 100;
    let status: StatusAlunoSimulado;
    let questaoAtual: number;
    if (offset < 15) {
      status = "nao_iniciou";
      questaoAtual = 0;
    } else if (offset < 80) {
      status = "em_andamento";
      questaoAtual = Math.floor((offset / 80) * totalQuestoes);
    } else if (offset < 90) {
      status = "desconectou";
      questaoAtual = Math.floor((offset / 100) * totalQuestoes);
    } else {
      status = "finalizado";
      questaoAtual = totalQuestoes;
    }

    return {
      alunoId: aId,
      nome: aluno?.nome ?? "Aluno",
      fotoUrl: aluno?.fotoUrl,
      status,
      questaoAtualIndice: questaoAtual,
      totalQuestoes,
      tempoRestanteSegundos: Math.max(
        0,
        simulado.parametros.tempoLimiteMinutos * 60 - (offset * 30),
      ),
      conexaoOk: status !== "desconectou",
      ultimaAtividadeEm: new Date(Date.now() - offset * 1000).toISOString(),
    };
  });

  // contagens agregadas
  const contagens = {
    nao_iniciou: alunos.filter((a) => a.status === "nao_iniciou").length,
    em_andamento: alunos.filter((a) => a.status === "em_andamento").length,
    finalizado: alunos.filter((a) => a.status === "finalizado").length,
    desconectou: alunos.filter((a) => a.status === "desconectou").length,
    total: alunos.length,
  };

  return NextResponse.json({
    simulado,
    alunos,
    contagens,
    tempoLimiteMinutos: simulado.parametros.tempoLimiteMinutos,
  });
}
