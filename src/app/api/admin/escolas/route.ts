import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import {
  mapEscola,
  mapUsuario,
  type EscolaBackend,
  type UsuarioBackend,
} from "@/lib/backend-maps";
import type { Usuario } from "@/types";

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

async function gestoresPorEscola(
  token: string | null,
): Promise<Map<string, Usuario[]>> {
  const resp = await backendFetch<ListaUsuariosBackend>("/usuarios", {
    token,
    query: {
      perfil: ["gestor"],
      ativo: true,
      por_pagina: 200,
    },
  });

  const mapa = new Map<string, Usuario[]>();
  for (const gestor of resp.dados.map(mapUsuario)) {
    if (!gestor.escolaId) continue;
    const lista = mapa.get(gestor.escolaId) ?? [];
    lista.push(gestor);
    mapa.set(gestor.escolaId, lista);
  }
  return mapa;
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  const url = new URL(request.url);

  try {
    const [resp, gestores] = await Promise.all([
      backendFetch<{ total: number; dados: EscolaBackend[] }>(
        "/estrutura/escolas",
        { token, query: { busca: url.searchParams.get("busca") ?? undefined } },
      ),
      gestoresPorEscola(token).catch(() => new Map<string, Usuario[]>()),
    ]);

    return NextResponse.json({
      dados: resp.dados.map((py) => {
        const escola = mapEscola(py);
        const listaGestores = gestores.get(escola.id) ?? [];
        return {
          ...escola,
          gestorIds: listaGestores.map((g) => g.id),
          gestores: listaGestores,
        };
      }),
    });
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  if (!body.nome || !body.codigoInep || !body.municipio || !body.uf) {
    return NextResponse.json(
      {
        codigo: "CAMPOS_OBRIGATORIOS",
        mensagem: "nome, codigoInep, municipio e uf são obrigatórios.",
      },
      { status: 422 },
    );
  }

  try {
    const py = await backendFetch<EscolaBackend>("/estrutura/escolas", {
      method: "POST",
      token,
      body: {
        nome: body.nome,
        municipio: body.municipio,
        codigo_inep: body.codigoInep,
        uf: body.uf,
        endereco: body.endereco,
        cep: body.cep,
        telefone: body.telefone,
        email_contato: body.emailContato,
      },
    });
    const criada = { ...mapEscola(py), gestores: [] };

    return NextResponse.json(criada, { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
