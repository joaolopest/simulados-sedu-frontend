import { NextResponse } from "next/server";
import { mockQuestoes } from "@/lib/mocks";
import type {
  CuradoriaIA,
  DistribuicaoDificuldade,
  ParametrosSimulado,
} from "@/types";

interface CorpoCurar {
  parametros: ParametrosSimulado;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // simula 8-12s de "geração IA"
  await new Promise((r) => setTimeout(r, 8000 + Math.random() * 4000));

  await params; // satisfaz Next 16

  let corpo: CorpoCurar;
  try {
    corpo = (await request.json()) as CorpoCurar;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo inválido." },
      { status: 400 },
    );
  }

  const { parametros } = corpo;

  // distribuição alvo
  const alvo = parametros.distribuicao;
  const total = parametros.quantidadeQuestoes;

  // filtra questões das matérias selecionadas + série
  const candidatas = mockQuestoes.filter(
    (q) =>
      parametros.materias.includes(q.materia) &&
      q.serie === parametros.serie &&
      q.status === "publicada",
  );

  // separa por nível
  const porNivel = {
    facil: candidatas.filter((q) => q.nivel === "facil"),
    medio: candidatas.filter((q) => q.nivel === "medio"),
    dificil: candidatas.filter((q) => q.nivel === "dificil"),
  };

  const meta = {
    facil: Math.round((alvo.facil / 100) * total),
    medio: Math.round((alvo.medio / 100) * total),
    dificil: Math.round((alvo.dificil / 100) * total),
  };

  const selecionadas = [
    ...porNivel.facil.slice(0, meta.facil),
    ...porNivel.medio.slice(0, meta.medio),
    ...porNivel.dificil.slice(0, meta.dificil),
  ];

  // se faltou (banco escasso), completa com qualquer da matéria
  const restante = total - selecionadas.length;
  if (restante > 0) {
    const ja = new Set(selecionadas.map((q) => q.id));
    const extras = candidatas.filter((q) => !ja.has(q.id)).slice(0, restante);
    selecionadas.push(...extras);
  }

  const distribuicaoReal: DistribuicaoDificuldade = {
    facil: Math.round(
      (selecionadas.filter((q) => q.nivel === "facil").length /
        selecionadas.length) *
        100,
    ),
    medio: Math.round(
      (selecionadas.filter((q) => q.nivel === "medio").length /
        selecionadas.length) *
        100,
    ),
    dificil: Math.round(
      (selecionadas.filter((q) => q.nivel === "dificil").length /
        selecionadas.length) *
        100,
    ),
  };

  // confiança: maior quando alvo bate com real
  const desvioFacil = Math.abs(alvo.facil - distribuicaoReal.facil);
  const desvioMedio = Math.abs(alvo.medio - distribuicaoReal.medio);
  const desvioDificil = Math.abs(alvo.dificil - distribuicaoReal.dificil);
  const desvioTotal = desvioFacil + desvioMedio + desvioDificil;
  const confiancaBase = 100 - desvioTotal * 1.5;

  // 20% de chance de cair pra <60% pra testar fluxo de revisão obrigatória
  const cairProBaixo = Math.random() < 0.2;
  const confiancaPercentual = cairProBaixo
    ? Math.max(35, 35 + Math.random() * 22)
    : Math.max(60, Math.min(95, confiancaBase + Math.random() * 10 - 5));

  const observacoes: string[] = [];
  if (selecionadas.length < total) {
    observacoes.push(
      `Banco escasso para esta combinação — apenas ${selecionadas.length} de ${total} questões disponíveis.`,
    );
  }
  if (desvioTotal > 15) {
    observacoes.push(
      `Distribuição real desviou do alvo em ${desvioTotal} pontos. Considere ajustar a meta ou expandir o banco.`,
    );
  }
  if (parametros.adaptacoesAceitas.length > 0) {
    observacoes.push(
      `${parametros.adaptacoesAceitas.length} adaptação(ões) cognitiva(s) aplicada(s) automaticamente.`,
    );
  }
  if (confiancaPercentual < 60) {
    observacoes.push(
      "Confiança abaixo de 60% — revisão obrigatória pelo coordenador antes de liberar.",
    );
  }

  const curadoria: CuradoriaIA = {
    confiancaPercentual: Math.round(confiancaPercentual),
    distribuicaoReal,
    tempoCuradoriaSegundos: 9 + Math.floor(Math.random() * 4),
    geradoEm: new Date().toISOString(),
    tentativas: 1,
    observacoes,
  };

  return NextResponse.json({
    curadoria,
    questoesSelecionadas: selecionadas,
    questaoIds: selecionadas.map((q) => q.id),
  });
}
