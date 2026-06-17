import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import {
  mapEscola,
  mapUsuario,
  type EscolaBackend,
  type UsuarioBackend,
} from "@/lib/backend-maps";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

interface ListaUsuariosBackend {
  total: number;
  pagina: number;
  por_pagina: number;
  dados: UsuarioBackend[];
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
  contexto: ContextoRota,
): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const { id } = await contexto.params;

  try {
    const [py, gestoresResp] = await Promise.all([
      backendFetch<EscolaBackend>(`/estrutura/escolas/${id}`, { token }),
      backendFetch<ListaUsuariosBackend>("/usuarios", {
        token,
        query: {
          perfil: ["gestor"],
          ativo: true,
          escola_id: id,
          por_pagina: 100,
        },
      }),
    ]);

    const escola = mapEscola(py);
    const gestores = gestoresResp.dados.map(mapUsuario);
    return NextResponse.json({
      ...escola,
      gestorIds: gestores.map((g) => g.id),
      gestores,
    });
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
    await backendFetch(`/estrutura/escolas/${id}`, { method: "DELETE", token });

    return NextResponse.json({ id, removida: true });
  } catch (erro) {
    return respostaErro(erro);
  }
}
