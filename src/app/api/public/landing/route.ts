import { NextResponse } from "next/server";
import { backendFetch, ErroBackend } from "@/lib/backend";

export interface LandingPublica {
  metricas: {
    totalEscolas: number;
    totalMunicipios: number;
    totalAlunos: number;
    totalAdaptacoes: number;
    totalSimulados: number;
    totalQuestoes: number;
    totalGestores: number;
    anoReferencia: number;
  };
  escolas: {
    id: string;
    nome: string;
    municipio: string;
    uf: string;
    inicial: string;
    totalAlunos: number;
    totalTurmas: number;
  }[];
  depoimentos: {
    nome: string;
    papel: string;
    escola: string;
    tipo: "gestor" | "professor" | "aluno";
    quote: string;
  }[];
}

export async function GET(): Promise<NextResponse> {
  try {
    const dados = await backendFetch<LandingPublica>("/public/landing");
    return NextResponse.json(dados);
  } catch (erro) {
    if (erro instanceof ErroBackend) {
      return NextResponse.json(erro.corpo, { status: erro.status });
    }
    return NextResponse.json(
      { codigo: "ERRO_DESCONHECIDO", mensagem: "Erro inesperado." },
      { status: 500 },
    );
  }
}
