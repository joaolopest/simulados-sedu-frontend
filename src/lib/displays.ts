import type {
  AdaptacaoCognitiva,
  Materia,
  NivelDificuldade,
  SerieEscolar,
} from "@/types";

export const NOMES_ADAPTACAO: Record<AdaptacaoCognitiva, string> = {
  tdah: "TDAH",
  dislexia: "Dislexia",
  discalculia: "Discalculia",
  autismo: "Autismo",
  deficiencia_visual: "Deficiência visual",
  deficiencia_auditiva: "Deficiência auditiva",
};

export function obterNomeAdaptacao(adaptacao: AdaptacaoCognitiva): string {
  return NOMES_ADAPTACAO[adaptacao] ?? "—";
}

export const NOMES_MATERIA: Record<Materia, string> = {
  linguagens: "Linguagens",
  ciencias_humanas: "Ciências Humanas",
  ciencias_natureza: "Ciências da Natureza",
  portugues: "Português",
  matematica: "Matemática",
  ciencias: "Ciências",
  historia: "História",
  geografia: "Geografia",
  ingles: "Inglês",
  artes: "Artes",
  educacao_fisica: "Educação Física",
  fisica: "Física",
  quimica: "Química",
  biologia: "Biologia",
  filosofia: "Filosofia",
  sociologia: "Sociologia",
};

export const NOMES_SERIE: Record<SerieEscolar, string> = {
  "1_fundamental": "1º Ano · Fundamental",
  "2_fundamental": "2º Ano · Fundamental",
  "3_fundamental": "3º Ano · Fundamental",
  "4_fundamental": "4º Ano · Fundamental",
  "5_fundamental": "5º Ano · Fundamental",
  "6_fundamental": "6º Ano · Fundamental",
  "7_fundamental": "7º Ano · Fundamental",
  "8_fundamental": "8º Ano · Fundamental",
  "9_fundamental": "9º Ano · Fundamental",
  "1_medio": "1º Ano · Médio",
  "2_medio": "2º Ano · Médio",
  "3_medio": "3º Ano · Médio",
};

export const NOMES_NIVEL: Record<NivelDificuldade, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export function obterNomeMaterias(
  materias: Materia[] | null | undefined,
): string {
  if (!materias || materias.length === 0) return "—";
  if (materias.length === 1) return NOMES_MATERIA[materias[0]] ?? "—";
  if (materias.length === 2) {
    return `${NOMES_MATERIA[materias[0]]} + ${NOMES_MATERIA[materias[1]]}`;
  }
  return `${materias.length} matérias`;
}

export function obterNomeMateria(materia: Materia | null | undefined): string {
  if (!materia) return "—";
  return NOMES_MATERIA[materia] ?? "—";
}

export function obterNomeSerie(serie: SerieEscolar): string {
  return NOMES_SERIE[serie] ?? "—";
}

export function saudacaoDoMomento(): string {
  const hora = new Date().getHours();
  if (hora < 5) return "Boa madrugada";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
