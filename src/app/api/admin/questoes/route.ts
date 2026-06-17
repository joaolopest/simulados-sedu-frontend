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
  criadoPor?: string;
  alternativas?: { texto: string; correta?: boolean }[];
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

interface ListaBackend {
  total: number;
  pagina: number;
  por_pagina: number;
  dados: QuestaoBackend[];
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const url = new URL(request.url);
  const pagina = url.searchParams.get("pagina") ?? "1";
  const porPagina = url.searchParams.get("porPagina") ?? "20";

  try {
    const resp = await backendFetch<ListaBackend>("/questoes", {
      token,
      query: {
        busca: url.searchParams.get("busca") ?? undefined,
        // filtros vÃªm em code; o Python filtra por nome de exibiÃ§Ã£o
        serie: url.searchParams.getAll("serie").map(serieParaNome),
        materia: url.searchParams.getAll("materia").map(materiaParaNome),
        nivel: url.searchParams.getAll("nivel").map(nivelParaNome),
        status: url.searchParams.getAll("status"),
        adaptacao: url.searchParams.getAll("adaptacao"),
        pagina,
        por_pagina: porPagina,
      },
    });

    const porPaginaNum = parseInt(porPagina, 10) || 20;
    return NextResponse.json({
      dados: resp.dados.map(mapQuestao),
      meta: {
        pagina: parseInt(pagina, 10) || 1,
        porPagina: porPaginaNum,
        total: resp.total,
        totalPaginas: Math.max(1, Math.ceil(resp.total / porPaginaNum)),
      },
    });
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);

  let body: CorpoQuestao;
  try {
    body = (await request.json()) as CorpoQuestao;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisiÃ§Ã£o invÃ¡lido." },
      { status: 400 },
    );
  }

  const payload = {
    enunciado: body.enunciado,
    serie: body.serie ? serieParaNome(body.serie) : undefined,
    materia: body.materia ? materiaParaNome(body.materia) : undefined,
    conteudo: body.conteudo,
    nivel: body.nivel ? nivelParaNome(body.nivel) : undefined,
    adaptacoes: body.adaptacoes ?? [],
    competencias: body.competencias ?? [],
    explicacao: body.explicacao ?? null,
    tempo_estimado_segundos: body.tempoEstimadoSegundos ?? 60,
    status: body.status ?? "rascunho",
    imagem_url: body.imagemUrl ?? null,
    criado_por_id:
      typeof body.criadoPor === "string" && /^\d+$/.test(body.criadoPor)
        ? Number(body.criadoPor)
        : null,
    alternativas: (body.alternativas ?? []).map((a) => ({
      texto: a.texto,
      correta: !!a.correta,
    })),
  };

  try {
    const py = await backendFetch<QuestaoBackend>("/questoes", {
      method: "POST",
      token,
      body: payload,
    });
    const criada = mapQuestao(py);
    return NextResponse.json(criada, { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
