import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapUsuario, type UsuarioBackend } from "@/lib/backend-maps";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

function comEscola(py: UsuarioBackend) {
  return { ...mapUsuario(py), escola: py.escola_nome ?? null };
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

function payloadUsuario(body: Record<string, unknown>): Record<string, unknown> {
  const { escolaId, ...resto } = body;
  return {
    ...resto,
    escola_id:
      typeof escolaId === "string" && escolaId.length > 0
        ? Number(escolaId)
        : undefined,
  };
}

export async function GET(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;
  try {
    const py = await backendFetch<UsuarioBackend>(`/usuarios/${id}`, { token });
    return NextResponse.json(comEscola(py));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function PATCH(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;

  let patch: Record<string, unknown>;
  try {
    patch = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo invÃ¡lido." },
      { status: 400 },
    );
  }

  try {
    const py = await backendFetch<UsuarioBackend>(`/usuarios/${id}`, {
      method: "PATCH",
      token,
      body: payloadUsuario(patch),
    });
    const atualizado = comEscola(py);

    return NextResponse.json(atualizado);
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function DELETE(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;

  try {
    const resp = await backendFetch<{ id: number; removido: boolean }>(
      `/usuarios/${id}`,
      { method: "DELETE", token },
    );

    return NextResponse.json({ id: String(resp.id ?? id), removido: true });
  } catch (erro) {
    return respostaErro(erro);
  }
}
