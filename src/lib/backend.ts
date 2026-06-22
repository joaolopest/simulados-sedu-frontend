// Cliente server-side único para as rotas Next.js (BFF) falarem com o backend
// Python (FastAPI). Roda SÓ no servidor (route handlers) — nunca no browser.
//
// O frontend continua chamando "/api/..." (rotas Next) via axios; essas rotas,
// por sua vez, usam `backendFetch` para buscar os dados reais no Python e
// adaptam o formato (ver backend-maps.ts) antes de devolver pro front.

import type { ErroApi } from "@/types";

// Resolve a base do backend conforme o ambiente:
//  1) BACKEND_URL explícito  -> Docker compose (http://backend:8000) ou override.
//  2) Vercel (multi-serviço) -> o FastAPI fica no MESMO deployment, sob /_/backend
//     (ver vercel.json experimentalServices). VERCEL_URL = host do deployment atual.
//  3) Local (dev/uvicorn)    -> 127.0.0.1 (não "localhost") evita mismatch IPv6/IPv4
//     no Windows: o uvicorn escuta em IPv4 e "localhost" pode resolver para ::1.
function resolverBaseBackend(): string {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/_/backend`;
  return "http://127.0.0.1:8000";
}

const BASE = resolverBaseBackend();

type Metodo = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface OpcoesBackend {
  method?: Metodo;
  body?: unknown;
  token?: string | null;
  query?: Record<
    string,
    string | number | boolean | string[] | undefined | null
  >;
}

/** Erro com status HTTP + corpo já no shape { codigo, mensagem } do front. */
export class ErroBackend extends Error {
  constructor(
    public readonly status: number,
    public readonly corpo: ErroApi,
  ) {
    super(corpo.mensagem);
    this.name = "ErroBackend";
  }
}

/** Lê o Bearer token que o axios do front manda (via cookie sedu-token). */
export function tokenDaRequisicao(request: Request): string | null {
  const auth = request.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

function montarQuery(query?: OpcoesBackend["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(query)) {
    if (valor === undefined || valor === null) continue;
    if (Array.isArray(valor)) {
      for (const v of valor) params.append(chave, String(v));
    } else {
      params.append(chave, String(valor));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

// FastAPI devolve erro em { detail: ... } (string, objeto {codigo,mensagem}, ou
// lista de erros de validação). Convertemos pro { codigo, mensagem } do front.
function normalizarErro(status: number, dados: unknown): ErroApi {
  let codigo = "ERRO_BACKEND";
  let mensagem = "Erro inesperado na requisição.";

  if (dados && typeof dados === "object") {
    const d = dados as Record<string, unknown>;
    if (typeof d.codigo === "string" && typeof d.mensagem === "string") {
      return { codigo: d.codigo, mensagem: d.mensagem }; // já no nosso shape
    }
    const detail = d.detail;
    if (typeof detail === "string") {
      mensagem = detail;
    } else if (Array.isArray(detail)) {
      codigo = "VALIDACAO";
      mensagem = "Dados inválidos.";
    } else if (detail && typeof detail === "object") {
      const det = detail as Record<string, unknown>;
      if (typeof det.codigo === "string") codigo = det.codigo;
      if (typeof det.mensagem === "string") mensagem = det.mensagem as string;
    }
  } else if (typeof dados === "string" && dados) {
    mensagem = dados;
  }

  // Códigos amigáveis por status (alinha com normalizarErro de lib/api.ts).
  if (status === 401) codigo = "NAO_AUTENTICADO";
  else if (status === 403) codigo = "SEM_PERMISSAO";
  else if (status === 404 && codigo === "ERRO_BACKEND") codigo = "NAO_ENCONTRADO";
  else if (status === 409 && codigo === "ERRO_BACKEND") codigo = "CONFLITO";

  return { codigo, mensagem };
}

/**
 * Chama o backend Python e devolve o JSON tipado. Em erro HTTP ou de rede,
 * lança `ErroBackend` (que a rota Next converte em NextResponse com o status).
 */
export async function backendFetch<T>(
  path: string,
  opcoes: OpcoesBackend = {},
): Promise<T> {
  const { method = "GET", body, token, query } = opcoes;
  const url = `${BASE}${path}${montarQuery(query)}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ErroBackend(503, {
      codigo: "ERRO_REDE",
      mensagem: "Não foi possível conectar ao servidor da API.",
    });
  }

  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  let dados: unknown = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = texto;
    }
  }

  if (!resposta.ok) {
    throw new ErroBackend(resposta.status, normalizarErro(resposta.status, dados));
  }
  return dados as T;
}

export async function backendFetchRaw(
  path: string,
  opcoes: OpcoesBackend = {},
): Promise<Response> {
  const { method = "GET", body, token, query } = opcoes;
  const url = `${BASE}${path}${montarQuery(query)}`;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ErroBackend(503, {
      codigo: "ERRO_REDE",
      mensagem: "Não foi possível conectar ao servidor da API.",
    });
  }

  if (!resposta.ok) {
    const texto = await resposta.text();
    let dados: unknown = null;
    if (texto) {
      try {
        dados = JSON.parse(texto);
      } catch {
        dados = texto;
      }
    }
    throw new ErroBackend(
      resposta.status,
      normalizarErro(resposta.status, dados),
    );
  }

  return resposta;
}
