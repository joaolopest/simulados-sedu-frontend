import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

interface RespostaMontar {
  id: string;
  status: string;
  totalQuestoes: number;
  questaoIds: string[];
}

// Salva a prova montada manualmente: define a lista exata de questões do
// simulado (por id). Repassa o Bearer; o backend (montadores_prova) decide
// quem pode — admin, gestor ou professor.
export async function POST(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;

  let body: { questaoIds?: string[] };
  try {
    body = (await request.json()) as { questaoIds?: string[] };
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  try {
    const resp = await backendFetch<RespostaMontar>(
      `/gestor/simulados/${id}/montar`,
      { method: "POST", token, body: { questaoIds: body.questaoIds ?? [] } },
    );
    return NextResponse.json(resp);
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
