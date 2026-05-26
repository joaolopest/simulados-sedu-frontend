import { http, HttpResponse, delay, type HttpHandler } from "msw";
import type {
  AcaoAuditoria,
  CuradoriaIA,
  DesempenhoCompetencia,
  DiagnosticoSimulado,
  Escola,
  ErroApi,
  FiltroQuestao,
  ItemRejeitado,
  Materia,
  MensagemResultadoIA,
  NivelDificuldade,
  SugestaoReforco,
  Notificacao,
  ParametrosSimulado,
  PrevisaoRiscoAluno,
  Questao,
  ResultadoImportacao,
  ResultadoSimulado,
  RespostaQuestao,
  SerieEscolar,
  Simulado,
  SimuladoEmAndamento,
  StatusSimulado,
  Turma,
  Usuario,
  UsuarioAutenticado,
} from "@/types";
import { gerarIdAleatorio } from "@/lib/utils";

// ----------------------------------------------------------------------------
// Tipos auxiliares — tudo que o módulo de mocks deve expor.
// ----------------------------------------------------------------------------

interface ModuloMocks {
  SIMULAR_LATENCIA?: () => Promise<void> | number;
  SIMULAR_FALHA?: () => boolean;
  mockUsuarios?: Usuario[];
  mockUsuariosPorPerfil?: Record<string, Usuario>;
  mockEscolas?: Escola[];
  mockTurmas?: Turma[];
  mockQuestoes?: Questao[];
  mockSimulados?: Simulado[];
  mockResultados?: ResultadoSimulado[];
  mockSimuladosEmAndamento?: SimuladoEmAndamento[];
  mockNotificacoes?: Notificacao[];
  mockAuditoria?: AcaoAuditoria[];
  mockDiagnosticos?: DiagnosticoSimulado[];
  mockRiscoAlunos?: PrevisaoRiscoAluno[];
  mockInsights?: unknown[];
  mockMensagensResultado?: MensagemResultadoIA[];
  mockSugestoesReforco?: SugestaoReforco[];
}

let mocksCacheados: ModuloMocks | null = null;

async function carregarMocks(): Promise<ModuloMocks> {
  if (mocksCacheados) return mocksCacheados;
  try {
    const modulo = (await import("@/lib/mocks")) as ModuloMocks;
    mocksCacheados = modulo;
    return modulo;
  } catch {
    mocksCacheados = {};
    return mocksCacheados;
  }
}

// ----------------------------------------------------------------------------
// Helpers de simulação (latência, falha aleatória, paginação, parsing).
// ----------------------------------------------------------------------------

async function simularLatencia(modulo: ModuloMocks): Promise<void> {
  if (typeof modulo.SIMULAR_LATENCIA === "function") {
    const resultado = modulo.SIMULAR_LATENCIA();
    if (resultado instanceof Promise) {
      await resultado;
      return;
    }
    if (typeof resultado === "number") {
      await delay(resultado);
      return;
    }
  }
  // Fallback: 200-800ms.
  const ms = 200 + Math.floor(Math.random() * 600);
  await delay(ms);
}

function simularFalha(modulo: ModuloMocks): boolean {
  if (typeof modulo.SIMULAR_FALHA === "function") {
    return modulo.SIMULAR_FALHA();
  }
  return Math.random() < 0.05;
}

function respostaFalhaSimulada(): HttpResponse<ErroApi> {
  const corpo: ErroApi = {
    codigo: "ERRO_SIMULADO",
    mensagem: "Falha simulada para teste",
  };
  return HttpResponse.json(corpo, { status: 503 });
}

function respostaErro(
  status: number,
  codigo: string,
  mensagem: string,
): HttpResponse<ErroApi> {
  const corpo: ErroApi = { codigo, mensagem };
  return HttpResponse.json(corpo, { status });
}

interface ParametrosPaginacao {
  pagina: number;
  porPagina: number;
}

function lerPaginacao(url: URL): ParametrosPaginacao {
  const pagina = Math.max(1, Number(url.searchParams.get("pagina") ?? 1) || 1);
  const porPagina = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("porPagina") ?? 20) || 20),
  );
  return { pagina, porPagina };
}

function paginar<T>(
  itens: T[],
  { pagina, porPagina }: ParametrosPaginacao,
): {
  dados: T[];
  meta: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
  };
} {
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const inicio = (pagina - 1) * porPagina;
  const dados = itens.slice(inicio, inicio + porPagina);
  return { dados, meta: { pagina, porPagina, total, totalPaginas } };
}

function lerArray(url: URL, chave: string): string[] {
  const valor = url.searchParams.getAll(chave);
  if (valor.length === 1 && valor[0]?.includes(",")) {
    return valor[0].split(",").filter(Boolean);
  }
  return valor.filter(Boolean);
}

function aplicarFiltrosQuestao(
  questoes: Questao[],
  url: URL,
): Questao[] {
  const filtros: FiltroQuestao = {
    serie: lerArray(url, "serie") as SerieEscolar[],
    materia: lerArray(url, "materia") as Materia[],
    conteudo: lerArray(url, "conteudo"),
    nivel: lerArray(url, "nivel") as NivelDificuldade[],
    busca: url.searchParams.get("busca") ?? undefined,
    status: lerArray(url, "status") as Questao["status"][],
  };
  return questoes.filter((questao) => {
    if (filtros.serie?.length && !filtros.serie.includes(questao.serie))
      return false;
    if (filtros.materia?.length && !filtros.materia.includes(questao.materia))
      return false;
    if (filtros.conteudo?.length && !filtros.conteudo.includes(questao.conteudo))
      return false;
    if (filtros.nivel?.length && !filtros.nivel.includes(questao.nivel))
      return false;
    if (filtros.status?.length && !filtros.status.includes(questao.status))
      return false;
    if (filtros.busca) {
      const alvo = filtros.busca.toLowerCase();
      if (!questao.enunciado.toLowerCase().includes(alvo)) return false;
    }
    return true;
  });
}

async function lerJSON<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function gerarTokenMock(usuarioId: string): string {
  return `mock.${usuarioId}.${Date.now().toString(36)}`;
}

function extrairUsuarioIdDoToken(token: string | null): string | null {
  if (!token) return null;
  const semBearer = token.replace(/^Bearer\s+/i, "");
  const partes = semBearer.split(".");
  if (partes.length < 2 || partes[0] !== "mock") return null;
  return partes[1] ?? null;
}

function buscarUsuarioPorRequest(
  modulo: ModuloMocks,
  request: Request,
): Usuario | null {
  const usuarioId = extrairUsuarioIdDoToken(request.headers.get("authorization"));
  if (!usuarioId) return null;
  return modulo.mockUsuarios?.find((usuario) => usuario.id === usuarioId) ?? null;
}

// ----------------------------------------------------------------------------
// AUTH
// ----------------------------------------------------------------------------

interface CorpoLogin {
  email: string;
  senha: string;
  perfilDev?: string;
}

const handlersAuth: HttpHandler[] = [
  http.post("/api/auth/login", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();

    const corpo = await lerJSON<CorpoLogin>(request);
    if (!corpo) {
      return respostaErro(400, "CORPO_INVALIDO", "Corpo da requisição inválido.");
    }

    let usuario: Usuario | undefined;

    if (corpo.perfilDev && modulo.mockUsuariosPorPerfil) {
      usuario = modulo.mockUsuariosPorPerfil[corpo.perfilDev];
    }

    if (!usuario) {
      usuario = modulo.mockUsuarios?.find(
        (item) => item.email.toLowerCase() === corpo.email.toLowerCase(),
      );
    }

    if (!usuario) {
      return respostaErro(
        401,
        "CREDENCIAIS_INVALIDAS",
        "Email ou senha incorretos.",
      );
    }

    const token = gerarTokenMock(usuario.id);
    const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();
    const autenticado: UsuarioAutenticado = { ...usuario, token, expiraEm };
    return HttpResponse.json({ usuario: autenticado, token });
  }),

  http.post("/api/auth/logout", async () => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    return HttpResponse.json({ ok: true });
  }),

  http.get("/api/auth/me", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    const usuario = buscarUsuarioPorRequest(modulo, request);
    if (!usuario) {
      return respostaErro(401, "NAO_AUTENTICADO", "Token inválido ou expirado.");
    }
    return HttpResponse.json(usuario);
  }),

  http.post("/api/auth/recuperar-senha", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    await lerJSON<{ email: string }>(request);
    return HttpResponse.json({ ok: true });
  }),

  http.post("/api/auth/primeiro-acesso", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const corpo = await lerJSON<{ token: string; novaSenha: string }>(request);
    if (!corpo?.token || !corpo?.novaSenha) {
      return respostaErro(400, "CORPO_INVALIDO", "Token e senha são obrigatórios.");
    }
    return HttpResponse.json({ ok: true });
  }),
];

// ----------------------------------------------------------------------------
// QUESTÕES
// ----------------------------------------------------------------------------

const handlersQuestoes: HttpHandler[] = [
  http.get("/api/questoes", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const url = new URL(request.url);
    const todas = modulo.mockQuestoes ?? [];
    const filtradas = aplicarFiltrosQuestao(todas, url);
    const paginacao = lerPaginacao(url);
    return HttpResponse.json(paginar(filtradas, paginacao));
  }),

  http.get("/api/questoes/:id", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    const id = String(params.id);
    const questao = modulo.mockQuestoes?.find((item) => item.id === id);
    if (!questao) {
      return respostaErro(404, "NAO_ENCONTRADO", "Questão não encontrada.");
    }
    return HttpResponse.json(questao);
  }),

  http.post("/api/questoes", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const corpo = await lerJSON<Partial<Questao>>(request);
    if (!corpo) {
      return respostaErro(400, "CORPO_INVALIDO", "Corpo inválido.");
    }
    const agora = new Date().toISOString();
    const nova: Questao = {
      id: gerarIdAleatorio("que"),
      enunciado: corpo.enunciado ?? "",
      serie: (corpo.serie ?? "1_medio") as SerieEscolar,
      materia: (corpo.materia ?? "portugues") as Materia,
      conteudo: corpo.conteudo ?? "",
      nivel: (corpo.nivel ?? "medio") as NivelDificuldade,
      alternativas: corpo.alternativas ?? [],
      adaptacoes: corpo.adaptacoes ?? [],
      tempoEstimadoSegundos: corpo.tempoEstimadoSegundos ?? 90,
      status: corpo.status ?? "rascunho",
      competencias: corpo.competencias ?? [],
      criadoPor: corpo.criadoPor ?? "usu_001",
      criadoEm: agora,
      atualizadoEm: agora,
      versao: 1,
      explicacao: corpo.explicacao,
      imagemUrl: corpo.imagemUrl,
    };
    return HttpResponse.json(nova, { status: 201 });
  }),

  http.patch("/api/questoes/:id", async ({ request, params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const id = String(params.id);
    const existente = modulo.mockQuestoes?.find((item) => item.id === id);
    if (!existente) {
      return respostaErro(404, "NAO_ENCONTRADO", "Questão não encontrada.");
    }
    const corpo = (await lerJSON<Partial<Questao>>(request)) ?? {};
    const atualizada: Questao = {
      ...existente,
      ...corpo,
      id: existente.id,
      atualizadoEm: new Date().toISOString(),
      versao: existente.versao + 1,
    };
    return HttpResponse.json(atualizada);
  }),

  http.delete("/api/questoes/:id", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const id = String(params.id);
    const existente = modulo.mockQuestoes?.find((item) => item.id === id);
    if (!existente) {
      return respostaErro(404, "NAO_ENCONTRADO", "Questão não encontrada.");
    }
    return HttpResponse.json({ ok: true });
  }),

  http.post("/api/questoes/importar", async () => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const totalLinhas = 50;
    const rejeitadas: ItemRejeitado[] = [
      {
        linha: 7,
        campo: "alternativas",
        motivo: "Menos de 4 alternativas informadas.",
        valor: 3,
      },
      {
        linha: 13,
        campo: "serie",
        motivo: "Série inválida.",
        valor: "12_medio",
      },
      {
        linha: 22,
        campo: "enunciado",
        motivo: "Enunciado vazio.",
        valor: "",
      },
    ];
    const resultado: ResultadoImportacao = {
      totalLinhas,
      importadas: totalLinhas - rejeitadas.length,
      rejeitadas,
      iniciadoEm: new Date(Date.now() - 4500).toISOString(),
      finalizadoEm: new Date().toISOString(),
    };
    return HttpResponse.json(resultado);
  }),
];

// ----------------------------------------------------------------------------
// SIMULADOS
// ----------------------------------------------------------------------------

function filtrarSimulados(simulados: Simulado[], url: URL): Simulado[] {
  const status = lerArray(url, "status") as StatusSimulado[];
  const escolaId = url.searchParams.get("escolaId");
  const turmaId = url.searchParams.get("turmaId");
  const criadoPor = url.searchParams.get("criadoPor");
  return simulados.filter((simulado) => {
    if (status.length && !status.includes(simulado.status)) return false;
    if (escolaId && simulado.escolaId !== escolaId) return false;
    if (turmaId && simulado.parametros.turmaId !== turmaId) return false;
    if (criadoPor && simulado.criadoPor !== criadoPor) return false;
    return true;
  });
}

const handlersSimulados: HttpHandler[] = [
  http.get("/api/simulados", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const url = new URL(request.url);
    const todos = modulo.mockSimulados ?? [];
    const filtrados = filtrarSimulados(todos, url);
    const paginacao = lerPaginacao(url);
    return HttpResponse.json(paginar(filtrados, paginacao));
  }),

  http.get("/api/simulados/:id", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    const simulado = modulo.mockSimulados?.find(
      (item) => item.id === String(params.id),
    );
    if (!simulado) {
      return respostaErro(404, "NAO_ENCONTRADO", "Simulado não encontrado.");
    }
    return HttpResponse.json(simulado);
  }),

  http.post("/api/simulados", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const corpo = await lerJSON<{
      parametros: ParametrosSimulado;
      escolaId: string;
      criadoPor: string;
    }>(request);
    if (!corpo) {
      return respostaErro(400, "CORPO_INVALIDO", "Corpo inválido.");
    }
    const agora = new Date().toISOString();
    const novo: Simulado = {
      id: gerarIdAleatorio("sim"),
      parametros: corpo.parametros,
      questaoIds: [],
      status: "rascunho",
      criadoPor: corpo.criadoPor,
      escolaId: corpo.escolaId,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    return HttpResponse.json(novo, { status: 201 });
  }),

  http.post("/api/simulados/:id/curar", async ({ params }) => {
    const modulo = await carregarMocks();
    // Curadoria: 8-12s.
    const ms = 8000 + Math.floor(Math.random() * 4000);
    await delay(ms);
    if (simularFalha(modulo)) return respostaFalhaSimulada();

    const id = String(params.id);
    const simulado = modulo.mockSimulados?.find((item) => item.id === id);
    if (!simulado) {
      return respostaErro(404, "NAO_ENCONTRADO", "Simulado não encontrado.");
    }

    // 20% das vezes confiança cai abaixo de 60% (testar fallback).
    const cairBaixo = Math.random() < 0.2;
    const confiancaPercentual = cairBaixo
      ? Math.floor(35 + Math.random() * 24) // 35-58
      : Math.floor(60 + Math.random() * 36); // 60-95

    const distribuicaoReal = simulado.parametros.distribuicao;
    const curadoria: CuradoriaIA = {
      confiancaPercentual,
      distribuicaoReal,
      tempoCuradoriaSegundos: Math.round(ms / 1000),
      geradoEm: new Date().toISOString(),
      tentativas: cairBaixo ? 3 : 1,
      observacoes: cairBaixo
        ? [
            "Banco insuficiente para alguns conteúdos.",
            "Distribuição aproximada — revisar manualmente.",
          ]
        : ["Distribuição atendida com sucesso."],
    };
    return HttpResponse.json(curadoria);
  }),

  http.post("/api/simulados/:id/liberar", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const id = String(params.id);
    const simulado = modulo.mockSimulados?.find((item) => item.id === id);
    if (!simulado) {
      return respostaErro(404, "NAO_ENCONTRADO", "Simulado não encontrado.");
    }
    return HttpResponse.json({
      ...simulado,
      status: "liberado" as StatusSimulado,
      liberadoEm: new Date().toISOString(),
    });
  }),

  http.get("/api/simulados/:id/acompanhar", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    const id = String(params.id);
    const lista = (modulo.mockSimuladosEmAndamento ?? []).filter(
      (item) => item.simuladoId === id,
    );
    return HttpResponse.json({ dados: lista });
  }),

  http.get("/api/simulados/:id/relatorio", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    const id = String(params.id);
    const simulado = modulo.mockSimulados?.find((item) => item.id === id);
    if (!simulado) {
      return respostaErro(404, "NAO_ENCONTRADO", "Simulado não encontrado.");
    }
    const resultados = (modulo.mockResultados ?? []).filter(
      (item) => item.simuladoId === id,
    );
    const total = resultados.length;
    const mediaNota =
      total === 0
        ? 0
        : resultados.reduce((acumulador, item) => acumulador + item.notaFinal, 0) /
          total;
    return HttpResponse.json({
      simuladoId: id,
      totalAlunos: total,
      mediaNota,
      resultados,
    });
  }),
];

// ----------------------------------------------------------------------------
// EXECUÇÃO DO ALUNO
// ----------------------------------------------------------------------------

const handlersExecucao: HttpHandler[] = [
  http.post("/api/simulados/:id/iniciar", async ({ params, request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const usuario = buscarUsuarioPorRequest(modulo, request);
    if (!usuario) {
      return respostaErro(401, "NAO_AUTENTICADO", "Sessão inválida.");
    }
    const id = String(params.id);
    const simulado = modulo.mockSimulados?.find((item) => item.id === id);
    if (!simulado) {
      return respostaErro(404, "NAO_ENCONTRADO", "Simulado não encontrado.");
    }
    const sessao: SimuladoEmAndamento = {
      simuladoId: id,
      alunoId: usuario.id,
      questaoAtualIndice: 0,
      iniciadoEm: new Date().toISOString(),
      ultimaAtividadeEm: new Date().toISOString(),
      tempoRestanteSegundos: simulado.parametros.tempoLimiteMinutos * 60,
      status: "em_andamento",
      conexaoOk: true,
    };
    return HttpResponse.json(sessao);
  }),

  http.patch("/api/simulados/:id/responder", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const corpo = await lerJSON<{
      questaoId: string;
      alternativaId?: string;
    }>(request);
    if (!corpo?.questaoId) {
      return respostaErro(400, "CORPO_INVALIDO", "questaoId é obrigatório.");
    }
    const resposta: RespostaQuestao = {
      questaoId: corpo.questaoId,
      alternativaId: corpo.alternativaId,
      status: corpo.alternativaId ? "respondida" : "em_branco",
      tempoGastoSegundos: 30 + Math.floor(Math.random() * 60),
      trocasDeResposta: 0,
      respondidaEm: new Date().toISOString(),
    };
    return HttpResponse.json(resposta);
  }),

  http.post("/api/simulados/:id/finalizar", async ({ params, request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const usuario = buscarUsuarioPorRequest(modulo, request);
    if (!usuario) {
      return respostaErro(401, "NAO_AUTENTICADO", "Sessão inválida.");
    }
    const simuladoId = String(params.id);
    const acertos = 5 + Math.floor(Math.random() * 5);
    const erros = 2 + Math.floor(Math.random() * 3);
    const emBranco = Math.floor(Math.random() * 2);
    const total = acertos + erros + emBranco;
    const desempenhoPorCompetencia: DesempenhoCompetencia[] = [
      {
        competencia: "Leitura e interpretação",
        totalQuestoes: total,
        acertos,
        taxaAcerto: total === 0 ? 0 : (acertos / total) * 100,
        mediaEstadual: 62,
      },
    ];
    const resultado: ResultadoSimulado = {
      id: gerarIdAleatorio("res"),
      simuladoId,
      alunoId: usuario.id,
      respostas: [],
      notaFinal: total === 0 ? 0 : (acertos / total) * 10,
      acertos,
      erros,
      emBranco,
      tempoTotalSegundos: 1800 + Math.floor(Math.random() * 1800),
      iniciadoEm: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      finalizadoEm: new Date().toISOString(),
      desempenhoPorCompetencia,
    };
    return HttpResponse.json(resultado);
  }),

  http.get("/api/resultados/:id", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    const id = String(params.id);
    const resultado = modulo.mockResultados?.find((item) => item.id === id);
    if (!resultado) {
      return respostaErro(404, "NAO_ENCONTRADO", "Resultado não encontrado.");
    }
    return HttpResponse.json(resultado);
  }),
];

// ----------------------------------------------------------------------------
// ESCOLAS, TURMAS E USUÁRIOS
// ----------------------------------------------------------------------------

const handlersEscolas: HttpHandler[] = [
  http.get("/api/escolas", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const url = new URL(request.url);
    const todas = modulo.mockEscolas ?? [];
    const paginacao = lerPaginacao(url);
    return HttpResponse.json(paginar(todas, paginacao));
  }),

  http.get("/api/escolas/:id", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    const escola = modulo.mockEscolas?.find(
      (item) => item.id === String(params.id),
    );
    if (!escola) {
      return respostaErro(404, "NAO_ENCONTRADO", "Escola não encontrada.");
    }
    return HttpResponse.json(escola);
  }),

  http.get("/api/turmas", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const url = new URL(request.url);
    const escolaId = url.searchParams.get("escolaId");
    let lista = modulo.mockTurmas ?? [];
    if (escolaId) {
      lista = lista.filter((item) => item.escolaId === escolaId);
    }
    return HttpResponse.json({ dados: lista });
  }),
];

const handlersUsuarios: HttpHandler[] = [
  http.get("/api/usuarios", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const url = new URL(request.url);
    const perfil = url.searchParams.get("perfil");
    const escolaId = url.searchParams.get("escolaId");
    const busca = url.searchParams.get("busca")?.toLowerCase();
    let lista = modulo.mockUsuarios ?? [];
    if (perfil) lista = lista.filter((item) => item.perfil === perfil);
    if (escolaId) lista = lista.filter((item) => item.escolaId === escolaId);
    if (busca) {
      lista = lista.filter(
        (item) =>
          item.nome.toLowerCase().includes(busca) ||
          item.email.toLowerCase().includes(busca),
      );
    }
    const paginacao = lerPaginacao(url);
    return HttpResponse.json(paginar(lista, paginacao));
  }),

  http.post("/api/usuarios", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const corpo = await lerJSON<Partial<Usuario>>(request);
    if (!corpo) {
      return respostaErro(400, "CORPO_INVALIDO", "Corpo inválido.");
    }
    const agora = new Date().toISOString();
    const novo: Usuario = {
      id: gerarIdAleatorio("usu"),
      nome: corpo.nome ?? "",
      email: corpo.email ?? "",
      perfil: corpo.perfil ?? "aluno",
      fotoUrl: corpo.fotoUrl,
      escolaId: corpo.escolaId,
      turmaIds: corpo.turmaIds,
      adaptacoes: corpo.adaptacoes,
      ativo: corpo.ativo ?? true,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    return HttpResponse.json(novo, { status: 201 });
  }),

  http.patch("/api/usuarios/:id", async ({ request, params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const id = String(params.id);
    const existente = modulo.mockUsuarios?.find((item) => item.id === id);
    if (!existente) {
      return respostaErro(404, "NAO_ENCONTRADO", "Usuário não encontrado.");
    }
    const corpo = (await lerJSON<Partial<Usuario>>(request)) ?? {};
    const atualizado: Usuario = {
      ...existente,
      ...corpo,
      id: existente.id,
      atualizadoEm: new Date().toISOString(),
    };
    return HttpResponse.json(atualizado);
  }),
];

// ----------------------------------------------------------------------------
// IA
// ----------------------------------------------------------------------------

const handlersIA: HttpHandler[] = [
  http.get("/api/ia/diagnosticos/:simuladoId", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const simuladoId = String(params.simuladoId);
    const diagnostico = modulo.mockDiagnosticos?.find(
      (item) => item.simuladoId === simuladoId,
    );
    if (diagnostico) return HttpResponse.json(diagnostico);
    const fallback: DiagnosticoSimulado = {
      id: gerarIdAleatorio("dia"),
      simuladoId,
      resumoExecutivo:
        "Turma demonstrou desempenho médio com lacunas em interpretação textual.",
      pontosFortes: ["Reconhecimento de gêneros textuais", "Cálculo básico"],
      pontosAtencao: ["Interpretação inferencial", "Operações com frações"],
      recomendacoesPedagogicas: [
        "Sessões focadas em leitura crítica.",
        "Atividades práticas com frações no cotidiano.",
      ],
      geradoEm: new Date().toISOString(),
      modeloUsado: "claude-mock-1",
      confiancaPercentual: 78,
    };
    return HttpResponse.json(fallback);
  }),

  http.get("/api/ia/risco/:alunoId", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const alunoId = String(params.alunoId);
    const risco = modulo.mockRiscoAlunos?.find(
      (item) => item.alunoId === alunoId,
    );
    if (!risco) {
      return respostaErro(404, "NAO_ENCONTRADO", "Aluno sem dados de risco.");
    }
    return HttpResponse.json(risco);
  }),

  http.get("/api/ia/insights", async () => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    return HttpResponse.json({ dados: modulo.mockInsights ?? [] });
  }),
];

// ----------------------------------------------------------------------------
// NOTIFICAÇÕES E AUDITORIA
// ----------------------------------------------------------------------------

const handlersOutros: HttpHandler[] = [
  http.get("/api/notificacoes", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const url = new URL(request.url);
    const lidasParam = url.searchParams.get("lidas");
    let lista = modulo.mockNotificacoes ?? [];
    if (lidasParam !== null) {
      const lidas = lidasParam === "true";
      lista = lista.filter((item) => item.lida === lidas);
    }
    return HttpResponse.json({ dados: lista });
  }),

  http.patch("/api/notificacoes/:id/marcar-lida", async ({ params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    const id = String(params.id);
    const existente = modulo.mockNotificacoes?.find((item) => item.id === id);
    if (!existente) {
      return respostaErro(404, "NAO_ENCONTRADO", "Notificação não encontrada.");
    }
    const atualizada: Notificacao = {
      ...existente,
      lida: true,
      lidaEm: new Date().toISOString(),
    };
    return HttpResponse.json(atualizada);
  }),

  http.get("/api/auditoria", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const url = new URL(request.url);
    const tipo = url.searchParams.get("tipo");
    const usuarioId = url.searchParams.get("usuarioId");
    let lista = modulo.mockAuditoria ?? [];
    if (tipo) lista = lista.filter((item) => item.tipo === tipo);
    if (usuarioId)
      lista = lista.filter((item) => item.usuarioId === usuarioId);
    const paginacao = lerPaginacao(url);
    return HttpResponse.json(paginar(lista, paginacao));
  }),
];

// ----------------------------------------------------------------------------
// ALUNO — endpoints agregados pra home, histórico e execução
// ----------------------------------------------------------------------------

const handlersAluno: HttpHandler[] = [
  http.get("/api/aluno/home", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();

    const usuario = buscarUsuarioPorRequest(modulo, request);
    if (!usuario) {
      return respostaErro(401, "NAO_AUTENTICADO", "Token inválido.");
    }

    const todosSimulados = modulo.mockSimulados ?? [];
    const turmaIds = usuario.turmaIds ?? [];

    // próximos: simulados liberados ou em andamento da turma do aluno
    const elegiveis = todosSimulados.filter((s) => {
      const dentroDaTurma = turmaIds.includes(s.parametros.turmaId);
      const statusAtivo =
        s.status === "liberado" || s.status === "em_andamento";
      return dentroDaTurma && statusAtivo;
    });

    const proximoSimulado = elegiveis[0] ?? null;

    // últimos resultados do aluno
    const todosResultados = modulo.mockResultados ?? [];
    const meusResultados = todosResultados
      .filter((r) => r.alunoId === usuario.id)
      .sort(
        (a, b) =>
          new Date(b.finalizadoEm).getTime() -
          new Date(a.finalizadoEm).getTime(),
      )
      .slice(0, 5);

    // série de evolução: últimas 6 notas (mais antigas primeiro)
    const evolucao = todosResultados
      .filter((r) => r.alunoId === usuario.id)
      .sort(
        (a, b) =>
          new Date(a.finalizadoEm).getTime() -
          new Date(b.finalizadoEm).getTime(),
      )
      .slice(-6)
      .map((r) => ({
        simuladoId: r.simuladoId,
        nota: r.notaFinal,
        data: r.finalizadoEm,
      }));

    // mensagem motivacional do mock
    const mensagem =
      modulo.mockMensagensResultado &&
      modulo.mockMensagensResultado.length > 0
        ? modulo.mockMensagensResultado[
            Math.floor(
              Math.random() * modulo.mockMensagensResultado.length,
            )
          ]
        : null;

    return HttpResponse.json({
      proximoSimulado,
      ultimosResultados: meusResultados,
      evolucao,
      mensagemBoasVindas: mensagem,
    });
  }),

  http.get("/api/aluno/historico", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();

    const usuario = buscarUsuarioPorRequest(modulo, request);
    if (!usuario) {
      return respostaErro(401, "NAO_AUTENTICADO", "Token inválido.");
    }

    const todosResultados = modulo.mockResultados ?? [];
    const meus = todosResultados
      .filter((r) => r.alunoId === usuario.id)
      .sort(
        (a, b) =>
          new Date(b.finalizadoEm).getTime() -
          new Date(a.finalizadoEm).getTime(),
      );

    // enriquece com nome do simulado pra exibir na timeline
    const enriquecidos = meus.map((r) => {
      const simulado = (modulo.mockSimulados ?? []).find(
        (s) => s.id === r.simuladoId,
      );
      return {
        ...r,
        simuladoNome: simulado?.parametros.nome ?? "Simulado",
        simuladoMateria: simulado?.parametros.materias[0] ?? null,
      };
    });

    return HttpResponse.json({ dados: enriquecidos });
  }),

  http.get("/api/aluno/simulado/:id", async ({ params, request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();

    const usuario = buscarUsuarioPorRequest(modulo, request);
    if (!usuario) {
      return respostaErro(401, "NAO_AUTENTICADO", "Token inválido.");
    }

    const id = String(params.id);
    const simulado = (modulo.mockSimulados ?? []).find((s) => s.id === id);
    if (!simulado) {
      return respostaErro(
        404,
        "NAO_ENCONTRADO",
        "Simulado não encontrado.",
      );
    }

    // hidrata as questões pelo id
    const questoes = (simulado.questaoIds ?? [])
      .map((qid) => (modulo.mockQuestoes ?? []).find((q) => q.id === qid))
      .filter((q): q is NonNullable<typeof q> => q !== undefined);

    return HttpResponse.json({ simulado, questoes });
  }),

  http.get(
    "/api/aluno/simulado/:simuladoId/resultado",
    async ({ params, request }) => {
      const modulo = await carregarMocks();
      await simularLatencia(modulo);
      if (simularFalha(modulo)) return respostaFalhaSimulada();

      const usuario = buscarUsuarioPorRequest(modulo, request);
      if (!usuario) {
        return respostaErro(401, "NAO_AUTENTICADO", "Token inválido.");
      }

      const simuladoId = String(params.simuladoId);
      const simulado = (modulo.mockSimulados ?? []).find(
        (s) => s.id === simuladoId,
      );
      if (!simulado) {
        return respostaErro(
          404,
          "NAO_ENCONTRADO",
          "Simulado não encontrado.",
        );
      }

      // pega o resultado deste aluno pra esse simulado
      const resultado = (modulo.mockResultados ?? []).find(
        (r) => r.simuladoId === simuladoId && r.alunoId === usuario.id,
      );
      if (!resultado) {
        return respostaErro(
          404,
          "NAO_ENCONTRADO",
          "Resultado não disponível.",
        );
      }

      // hidrata questões com gabarito
      const questoes = (simulado.questaoIds ?? [])
        .map((qid) => (modulo.mockQuestoes ?? []).find((q) => q.id === qid))
        .filter((q): q is NonNullable<typeof q> => q !== undefined);

      // diagnóstico do simulado (se houver)
      const diagnostico = (modulo.mockDiagnosticos ?? []).find(
        (d) => d.simuladoId === simuladoId,
      );

      // mensagem motivacional adequada à nota
      const mensagens = modulo.mockMensagensResultado ?? [];
      const tom: MensagemResultadoIA["tom"] =
        resultado.notaFinal >= 7
          ? "celebrativo"
          : resultado.notaFinal >= 5
            ? "encorajador"
            : "construtivo";
      const mensagem =
        mensagens.find((m) => m.tom === tom) ?? mensagens[0] ?? null;

      // sugestões de reforço — pega 3 aleatórias
      const sugestoes = [...(modulo.mockSugestoesReforco ?? [])]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      return HttpResponse.json({
        simulado,
        resultado,
        questoes,
        diagnostico: diagnostico ?? null,
        mensagem,
        sugestoes,
      });
    },
  ),
];

// ----------------------------------------------------------------------------
// SUPORTE (professor de apoio) — alunos com adaptações + espelhamento ao vivo
// ----------------------------------------------------------------------------

const handlersSuporte: HttpHandler[] = [
  // dashboard: alunos com adaptações sob responsabilidade do suporte logado
  http.get("/api/suporte/dashboard", async ({ request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();

    const usuario = buscarUsuarioPorRequest(modulo, request);
    if (!usuario) {
      return respostaErro(401, "NAO_AUTENTICADO", "Token inválido.");
    }

    const todosAlunos = (modulo.mockUsuarios ?? []).filter(
      (u) => u.perfil === "aluno",
    );
    const comAdaptacao = todosAlunos.filter(
      (a) => (a.adaptacoes ?? []).length > 0,
    );

    // últimos resultados por aluno (1 mais recente)
    const ultimoPorAluno = new Map<string, ResultadoSimulado | null>();
    for (const aluno of comAdaptacao) {
      const meus = (modulo.mockResultados ?? [])
        .filter((r) => r.alunoId === aluno.id)
        .sort(
          (a, b) =>
            new Date(b.finalizadoEm).getTime() -
            new Date(a.finalizadoEm).getTime(),
        );
      ultimoPorAluno.set(aluno.id, meus[0] ?? null);
    }

    // simulados em andamento por aluno (pra saber se está respondendo agora)
    const emAndamentoPorAluno = new Map<string, SimuladoEmAndamento | null>();
    for (const aluno of comAdaptacao) {
      const ativo = (modulo.mockSimuladosEmAndamento ?? []).find(
        (s) => s.alunoId === aluno.id && s.status === "em_andamento",
      );
      emAndamentoPorAluno.set(aluno.id, ativo ?? null);
    }

    // turmas pra exibir nome
    const turmaPorId = new Map(
      (modulo.mockTurmas ?? []).map((t) => [t.id, t]),
    );

    const lista = comAdaptacao.map((aluno) => {
      const turmaId = aluno.turmaIds?.[0];
      const turma = turmaId ? turmaPorId.get(turmaId) : undefined;
      return {
        aluno,
        turmaNome: turma?.nome ?? "—",
        ultimoResultado: ultimoPorAluno.get(aluno.id) ?? null,
        emAndamento: emAndamentoPorAluno.get(aluno.id) ?? null,
      };
    });

    return HttpResponse.json({
      dados: lista,
      contagem: {
        total: lista.length,
        respondendoAgora: lista.filter((i) => i.emAndamento !== null).length,
      },
    });
  }),

  // detalhes de um aluno + simulado em curso (se houver)
  http.get("/api/suporte/aluno/:id", async ({ params, request }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();

    const usuario = buscarUsuarioPorRequest(modulo, request);
    if (!usuario) {
      return respostaErro(401, "NAO_AUTENTICADO", "Token inválido.");
    }

    const id = String(params.id);
    const aluno = (modulo.mockUsuarios ?? []).find(
      (u) => u.id === id && u.perfil === "aluno",
    );
    if (!aluno) {
      return respostaErro(404, "NAO_ENCONTRADO", "Aluno não encontrado.");
    }

    const turmaId = aluno.turmaIds?.[0];
    const turma = turmaId
      ? (modulo.mockTurmas ?? []).find((t) => t.id === turmaId)
      : undefined;

    const escola = aluno.escolaId
      ? (modulo.mockEscolas ?? []).find((e) => e.id === aluno.escolaId)
      : undefined;

    // simulado em andamento (ou liberado mais recente)
    const emAndamento = (modulo.mockSimuladosEmAndamento ?? []).find(
      (s) => s.alunoId === id && s.status === "em_andamento",
    );

    let simuladoAtivo = null;
    let questoesAtivas: Questao[] = [];
    if (emAndamento) {
      const sim = (modulo.mockSimulados ?? []).find(
        (s) => s.id === emAndamento.simuladoId,
      );
      if (sim) {
        simuladoAtivo = sim;
        questoesAtivas = (sim.questaoIds ?? [])
          .map((qid) =>
            (modulo.mockQuestoes ?? []).find((q) => q.id === qid),
          )
          .filter((q): q is Questao => q !== undefined);
      }
    }

    // últimos 5 resultados
    const ultimos = (modulo.mockResultados ?? [])
      .filter((r) => r.alunoId === id)
      .sort(
        (a, b) =>
          new Date(b.finalizadoEm).getTime() -
          new Date(a.finalizadoEm).getTime(),
      )
      .slice(0, 5);

    return HttpResponse.json({
      aluno,
      turma: turma ?? null,
      escola: escola ?? null,
      simuladoAtivo,
      questoesAtivas,
      emAndamento: emAndamento ?? null,
      ultimosResultados: ultimos,
    });
  }),

  // espelhamento ao vivo: progresso atual + respostas até agora
  http.get(
    "/api/suporte/aluno/:id/espelhamento",
    async ({ params, request }) => {
      const modulo = await carregarMocks();
      await simularLatencia(modulo);
      if (simularFalha(modulo)) return respostaFalhaSimulada();

      const usuario = buscarUsuarioPorRequest(modulo, request);
      if (!usuario) {
        return respostaErro(401, "NAO_AUTENTICADO", "Token inválido.");
      }

      const id = String(params.id);
      const emAndamento = (modulo.mockSimuladosEmAndamento ?? []).find(
        (s) => s.alunoId === id && s.status === "em_andamento",
      );

      if (!emAndamento) {
        return HttpResponse.json({
          ativo: false,
          questaoAtualIndice: 0,
          respostas: {},
          tempoRestanteSegundos: 0,
          ultimaAtividadeEm: null,
          conexaoOk: true,
        });
      }

      // simula progresso variável a cada chamada (pra parecer ao vivo)
      const semente = Math.floor(Date.now() / 5000);
      const progressoBase = emAndamento.questaoAtualIndice;
      const progresso = Math.min(progressoBase + (semente % 3), 19);

      // gera respostas mock (até a questão atual)
      const sim = (modulo.mockSimulados ?? []).find(
        (s) => s.id === emAndamento.simuladoId,
      );
      const questaoIds = sim?.questaoIds ?? [];
      const respostas: Record<string, RespostaQuestao> = {};
      for (let i = 0; i < progresso; i++) {
        const qid = questaoIds[i];
        if (!qid) continue;
        const q = (modulo.mockQuestoes ?? []).find((x) => x.id === qid);
        if (!q || q.alternativas.length === 0) continue;
        const altIdx = i % q.alternativas.length;
        respostas[qid] = {
          questaoId: qid,
          alternativaId: q.alternativas[altIdx].id,
          status: "respondida",
          tempoGastoSegundos: 45 + (i * 7) % 60,
          trocasDeResposta: i % 2,
          respondidaEm: new Date(Date.now() - (progresso - i) * 30_000).toISOString(),
        };
      }

      return HttpResponse.json({
        ativo: true,
        questaoAtualIndice: progresso,
        respostas,
        tempoRestanteSegundos: Math.max(
          0,
          emAndamento.tempoRestanteSegundos - semente * 5,
        ),
        ultimaAtividadeEm: new Date().toISOString(),
        conexaoOk: emAndamento.conexaoOk,
      });
    },
  ),

  // registra nota pedagógica do suporte sobre o aluno
  http.post("/api/suporte/aluno/:id/nota", async ({ request, params }) => {
    const modulo = await carregarMocks();
    await simularLatencia(modulo);
    if (simularFalha(modulo)) return respostaFalhaSimulada();
    const corpo = await lerJSON<{ texto: string }>(request);
    if (!corpo?.texto || corpo.texto.length < 3) {
      return respostaErro(400, "CORPO_INVALIDO", "Texto da nota é obrigatório.");
    }
    return HttpResponse.json({
      id: gerarIdAleatorio("nota"),
      alunoId: String(params.id),
      texto: corpo.texto,
      registradaEm: new Date().toISOString(),
    });
  }),

  // solicita apoio presencial
  http.post(
    "/api/suporte/aluno/:id/apoio-presencial",
    async ({ params, request }) => {
      const modulo = await carregarMocks();
      await simularLatencia(modulo);
      const corpo = await lerJSON<{ motivo?: string }>(request);
      return HttpResponse.json({
        id: gerarIdAleatorio("apoio"),
        alunoId: String(params.id),
        motivo: corpo?.motivo ?? "Apoio solicitado pelo professor de suporte.",
        solicitadoEm: new Date().toISOString(),
        status: "aguardando",
      });
    },
  ),
];

// ----------------------------------------------------------------------------
// EXPORT FINAL
// ----------------------------------------------------------------------------

export const handlers: HttpHandler[] = [
  ...handlersAluno,
  ...handlersSuporte,
  ...handlersAuth,
  ...handlersQuestoes,
  ...handlersSimulados,
  ...handlersExecucao,
  ...handlersEscolas,
  ...handlersUsuarios,
  ...handlersIA,
  ...handlersOutros,
];
