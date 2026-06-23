import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapQuestao, type QuestaoBackend } from "@/lib/backend-maps";

interface RespostaSalvarRascunho {
  questao: QuestaoBackend;
  revisaoHumanaObrigatoria: boolean;
  status: string;
}

function respostaErro(erro: unknown): NextResponse {
  if (erro instanceof ErroBackend) {
    return NextResponse.json(erro.corpo, { status: erro.status });
  }
  return NextResponse.json(
    { codigo: "ERRO_DESCONHECIDO", mensagem: "Erro inesperado." },
    { status: 500 },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  try {
    const resp = await backendFetch<RespostaSalvarRascunho>(
      "/ia/questoes/rascunhos/salvar",
      { method: "POST", token, body },
    );
    return NextResponse.json(
      {
        ...resp,
        questao: mapQuestao(resp.questao),
      },
      { status: 201 },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
