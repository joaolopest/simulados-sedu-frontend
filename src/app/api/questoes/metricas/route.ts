import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import {
  mapQuestao,
  materiaParaNome,
  nivelParaNome,
  serieParaNome,
  type QuestaoBackend,
} from "@/lib/backend-maps";

interface MetricasQuestaoBackend {
  questao_id: number;
  total_usos: number;
  usos_recentes: number;
  total_respostas: number;
  preenchidas: number;
  acertos: number;
  erros: number;
  em_branco: number;
  taxa_acerto: number;
  taxa_erro: number;
  taxa_branco: number;
  tempo_medio_segundos: number;
  usada_recentemente: boolean;
  alternativas_total: number;
  alternativas_corretas: number;
  alertas: string[];
}

interface ItemMetricasBackend {
  questao: QuestaoBackend;
  metricas: MetricasQuestaoBackend;
}

interface ListaMetricasBackend {
  total: number;
  pagina: number;
  por_pagina: number;
  dados: ItemMetricasBackend[];
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

function mapMetricas(m: MetricasQuestaoBackend) {
  return {
    questaoId: String(m.questao_id),
    totalUsos: m.total_usos,
    usosRecentes: m.usos_recentes,
    totalRespostas: m.total_respostas,
    preenchidas: m.preenchidas,
    acertos: m.acertos,
    erros: m.erros,
    emBranco: m.em_branco,
    taxaAcerto: m.taxa_acerto,
    taxaErro: m.taxa_erro,
    taxaBranco: m.taxa_branco,
    tempoMedioSegundos: m.tempo_medio_segundos,
    usadaRecentemente: m.usada_recentemente,
    alternativasTotal: m.alternativas_total,
    alternativasCorretas: m.alternativas_corretas,
    alertas: m.alertas ?? [],
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const url = new URL(request.url);
  const pagina = url.searchParams.get("pagina") ?? "1";
  const porPagina = url.searchParams.get("porPagina") ?? "20";

  try {
    const resp = await backendFetch<ListaMetricasBackend>("/questoes/metricas", {
      token,
      query: {
        escopo: url.searchParams.get("escopo") ?? undefined,
        busca: url.searchParams.get("busca") ?? undefined,
        serie: url.searchParams.getAll("serie").map(serieParaNome),
        materia: url.searchParams.getAll("materia").map(materiaParaNome),
        conteudo: url.searchParams.getAll("conteudo"),
        nivel: url.searchParams.getAll("nivel").map(nivelParaNome),
        status: url.searchParams.getAll("status"),
        adaptacao: url.searchParams.getAll("adaptacao"),
        competencia: url.searchParams.getAll("competencia"),
        escola_id: url.searchParams.getAll("escolaId"),
        criado_por_id: url.searchParams.getAll("criadoPor"),
        com_imagem: url.searchParams.get("comImagem") ?? undefined,
        pagina,
        por_pagina: porPagina,
      },
    });

    const porPaginaNum = parseInt(porPagina, 10) || 20;
    return NextResponse.json({
      dados: resp.dados.map((item) => ({
        questao: mapQuestao(item.questao),
        metricas: mapMetricas(item.metricas),
      })),
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
