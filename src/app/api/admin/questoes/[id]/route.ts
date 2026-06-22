import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import {
  mapQuestao,
  materiaParaNome,
  nivelParaNome,
  serieParaNome,
  type QuestaoBackend,
} from "@/lib/backend-maps";

interface CorpoQuestao {
  enunciado?: string;
  serie?: string;
  materia?: string;
  conteudo?: string;
  nivel?: string;
  adaptacoes?: string[];
  competencias?: string[];
  explicacao?: string | null;
  tempoEstimadoSegundos?: number;
  status?: string;
  imagemUrl?: string | null;
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  try {
    const py = await backendFetch<QuestaoBackend>(`/questoes/${id}`, { token });
    return NextResponse.json(mapQuestao(py));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;

  let body: CorpoQuestao;
  try {
    body = (await request.json()) as CorpoQuestao;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo inválido." },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {};
  if (body.enunciado !== undefined) payload.enunciado = body.enunciado;
  if (body.serie !== undefined) payload.serie = serieParaNome(body.serie);
  if (body.materia !== undefined) payload.materia = materiaParaNome(body.materia);
  if (body.nivel !== undefined) payload.nivel = nivelParaNome(body.nivel);
  if (body.conteudo !== undefined) payload.conteudo = body.conteudo;
  if (body.adaptacoes !== undefined) payload.adaptacoes = body.adaptacoes;
  if (body.competencias !== undefined) payload.competencias = body.competencias;
  if (body.explicacao !== undefined) payload.explicacao = body.explicacao;
  if (body.tempoEstimadoSegundos !== undefined)
    payload.tempo_estimado_segundos = body.tempoEstimadoSegundos;
  if (body.status !== undefined) payload.status = body.status;
  if (body.imagemUrl !== undefined) payload.imagem_url = body.imagemUrl;

  try {
    const py = await backendFetch<QuestaoBackend>(`/questoes/${id}`, {
      method: "PATCH",
      token,
      body: payload,
    });
    const atualizada = mapQuestao(py);
    return NextResponse.json(atualizada);
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await params;
  try {
    await backendFetch(`/questoes/${id}`, { method: "DELETE", token });
    return NextResponse.json({ id, deletada: true });
  } catch (erro) {
    return respostaErro(erro);
  }
}
