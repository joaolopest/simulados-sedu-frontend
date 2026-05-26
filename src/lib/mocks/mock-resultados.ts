import type {
  DesempenhoCompetencia,
  ResultadoSimulado,
  RespostaQuestao,
} from "@/types";

// Os simulados finalizados são sim_009 (Português 4 questões) e sim_010 (Matemática 4 questões),
// ambos da turma tur_007 (9º ano da escola 2). 25 alunos respondem cada um.
// Os 25 alunos de tur_007 vão de usu_160 a usu_184 (25 ids — pegamos os 10 da turma + 15 da turma vizinha
// para totalizar 25; fica realista para um simulado de "rede" entre turmas).

const ALUNOS_RESPONDENTES: string[] = Array.from({ length: 25 }, (_, indice) =>
  `usu_${String(160 + indice).padStart(3, "0")}`,
);

// Sequência de notas determinística com média ~6,5 e desvio ~2,0
const NOTAS_PORTUGUES: number[] = [
  9.0, 7.5, 6.0, 8.0, 5.5, 7.0, 4.5, 8.5, 6.5, 7.0, 9.5, 3.5, 6.0, 7.5, 5.0,
  8.0, 6.5, 4.0, 7.5, 6.0, 9.0, 5.5, 7.0, 8.0, 6.5,
];

const NOTAS_MATEMATICA: number[] = [
  7.5, 5.5, 6.0, 4.5, 8.0, 3.5, 7.0, 9.0, 5.0, 6.5, 4.0, 7.5, 6.0, 8.5, 5.5,
  3.0, 7.0, 6.5, 8.0, 4.5, 5.0, 7.5, 6.0, 9.5, 6.5,
];

const COMPETENCIAS_PORTUGUES: string[] = [
  "EF09LP07",
  "EF09LP02",
  "EF09LP05",
  "EF09LP04",
  "EF06LP04",
];

const COMPETENCIAS_MATEMATICA: string[] = [
  "EF07MA18",
  "EF09MA06",
  "EF09MA14",
  "EM13MAT310",
  "EF06MA13",
  "EF06MA03",
];

function calcularDesempenhoPortugues(
  nota: number,
  semente: number,
): DesempenhoCompetencia[] {
  // Distribui a taxa geral (nota/10) por competências, com pequena variação.
  const taxaBase = nota / 10;
  return COMPETENCIAS_PORTUGUES.map((competencia, indice) => {
    const ruido = ((semente * 7 + indice * 13) % 25) / 100 - 0.12;
    const taxa = Math.max(0, Math.min(1, taxaBase + ruido));
    const total = 2 + (indice % 2); // 2 ou 3 questões por competência
    const acertos = Math.round(taxa * total);
    return {
      competencia,
      totalQuestoes: total,
      acertos,
      taxaAcerto: total === 0 ? 0 : Number((acertos / total).toFixed(2)),
      mediaEstadual: 0.58 + (indice * 0.04),
    };
  });
}

function calcularDesempenhoMatematica(
  nota: number,
  semente: number,
): DesempenhoCompetencia[] {
  const taxaBase = nota / 10;
  return COMPETENCIAS_MATEMATICA.map((competencia, indice) => {
    const ruido = ((semente * 11 + indice * 17) % 30) / 100 - 0.15;
    const taxa = Math.max(0, Math.min(1, taxaBase + ruido));
    const total = 2 + (indice % 2);
    const acertos = Math.round(taxa * total);
    return {
      competencia,
      totalQuestoes: total,
      acertos,
      taxaAcerto: total === 0 ? 0 : Number((acertos / total).toFixed(2)),
      mediaEstadual: 0.52 + (indice * 0.03),
    };
  });
}

function gerarRespostasPortugues(
  alunoId: string,
  nota: number,
  semente: number,
): RespostaQuestao[] {
  const questoes: Array<{ id: string; gabarito: string }> = [
    { id: "que_001", gabarito: "alt_que_001_c" },
    { id: "que_003", gabarito: "alt_que_003_a" },
    { id: "que_004", gabarito: "alt_que_004_b" },
    { id: "que_006", gabarito: "alt_que_006_b" },
  ];
  const acertosTotais = Math.round((nota / 10) * questoes.length);
  return questoes.map((questao, indice): RespostaQuestao => {
    const acertou = indice < acertosTotais;
    const tempoBase = 80 + ((semente * 11 + indice * 23) % 90);
    const trocas = (semente + indice) % 3;
    return {
      questaoId: questao.id,
      alternativaId: acertou
        ? questao.gabarito
        : `alt_${questao.id}_${["a", "b", "c", "d"][(indice + 1 + (semente % 3)) % 4]}`,
      status: "respondida",
      tempoGastoSegundos: tempoBase,
      trocasDeResposta: trocas,
      respondidaEm: `2026-04-15T${10 + indice * 2}:${String((alunoId.length * 7 + indice * 13) % 60).padStart(2, "0")}:00-03:00`,
    };
  });
}

function gerarRespostasMatematica(
  alunoId: string,
  nota: number,
  semente: number,
): RespostaQuestao[] {
  const questoes: Array<{ id: string; gabarito: string }> = [
    { id: "que_016", gabarito: "alt_que_016_b" },
    { id: "que_018", gabarito: "alt_que_018_b" },
    { id: "que_019", gabarito: "alt_que_019_a" },
    { id: "que_022", gabarito: "alt_que_022_b" },
  ];
  const acertosTotais = Math.round((nota / 10) * questoes.length);
  return questoes.map((questao, indice): RespostaQuestao => {
    const acertou = indice < acertosTotais;
    const tempoBase = 100 + ((semente * 13 + indice * 19) % 110);
    const trocas = (semente + indice * 2) % 4;
    const ficouEmBranco = indice === 3 && nota < 5;
    return {
      questaoId: questao.id,
      alternativaId: ficouEmBranco
        ? undefined
        : acertou
          ? questao.gabarito
          : `alt_${questao.id}_${["a", "b", "c", "d"][(indice + 2 + (semente % 3)) % 4]}`,
      status: ficouEmBranco ? "em_branco" : "respondida",
      tempoGastoSegundos: tempoBase,
      trocasDeResposta: trocas,
      respondidaEm: ficouEmBranco
        ? undefined
        : `2026-04-22T${10 + indice * 2}:${String((alunoId.length * 11 + indice * 17) % 60).padStart(2, "0")}:00-03:00`,
    };
  });
}

const resultadosPortugues: ResultadoSimulado[] = ALUNOS_RESPONDENTES.map(
  (alunoId, indice) => {
    const nota = NOTAS_PORTUGUES[indice];
    const respostas = gerarRespostasPortugues(alunoId, nota, indice);
    const acertos = respostas.filter((resposta, i) => {
      const gabaritos: Record<string, string> = {
        que_001: "alt_que_001_c",
        que_003: "alt_que_003_a",
        que_004: "alt_que_004_b",
        que_006: "alt_que_006_b",
      };
      return resposta.alternativaId === gabaritos[respostas[i].questaoId];
    }).length;
    const erros = respostas.filter(
      (resposta) => resposta.status === "respondida",
    ).length - acertos;
    const emBranco = respostas.filter((r) => r.status === "em_branco").length;
    const tempoTotal = respostas.reduce(
      (acc, r) => acc + r.tempoGastoSegundos,
      0,
    );
    return {
      id: `res_${String(indice + 1).padStart(3, "0")}`,
      simuladoId: "sim_009",
      alunoId,
      respostas,
      notaFinal: nota,
      acertos,
      erros,
      emBranco,
      tempoTotalSegundos: tempoTotal + 120, // tempo extra de leitura
      iniciadoEm: `2026-04-15T08:${String((indice * 7) % 60).padStart(2, "0")}:00-03:00`,
      finalizadoEm: `2026-04-15T${String(9 + Math.floor(indice / 12)).padStart(2, "0")}:${String((indice * 11 + 18) % 60).padStart(2, "0")}:00-03:00`,
      desempenhoPorCompetencia: calcularDesempenhoPortugues(nota, indice),
    };
  },
);

const resultadosMatematica: ResultadoSimulado[] = ALUNOS_RESPONDENTES.map(
  (alunoId, indice) => {
    const nota = NOTAS_MATEMATICA[indice];
    const respostas = gerarRespostasMatematica(alunoId, nota, indice);
    const acertos = respostas.filter((resposta, i) => {
      const gabaritos: Record<string, string> = {
        que_016: "alt_que_016_b",
        que_018: "alt_que_018_b",
        que_019: "alt_que_019_a",
        que_022: "alt_que_022_b",
      };
      return resposta.alternativaId === gabaritos[respostas[i].questaoId];
    }).length;
    const erros = respostas.filter(
      (resposta) => resposta.status === "respondida",
    ).length - acertos;
    const emBranco = respostas.filter((r) => r.status === "em_branco").length;
    const tempoTotal = respostas.reduce(
      (acc, r) => acc + r.tempoGastoSegundos,
      0,
    );
    return {
      id: `res_${String(indice + 26).padStart(3, "0")}`,
      simuladoId: "sim_010",
      alunoId,
      respostas,
      notaFinal: nota,
      acertos,
      erros,
      emBranco,
      tempoTotalSegundos: tempoTotal + 180,
      iniciadoEm: `2026-04-22T08:${String((indice * 11) % 60).padStart(2, "0")}:00-03:00`,
      finalizadoEm: `2026-04-22T${String(9 + Math.floor(indice / 12)).padStart(2, "0")}:${String((indice * 13 + 22) % 60).padStart(2, "0")}:00-03:00`,
      desempenhoPorCompetencia: calcularDesempenhoMatematica(nota, indice),
    };
  },
);

export const mockResultados: ResultadoSimulado[] = [
  ...resultadosPortugues,
  ...resultadosMatematica,
];
