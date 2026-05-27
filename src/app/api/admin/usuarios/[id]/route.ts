import { NextResponse } from "next/server";
import { mockEscolas, mockUsuarios } from "@/lib/mocks";
import { registrarAuditoria } from "@/lib/auditoria";
import type { Usuario } from "@/types";

interface ContextoRota {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
  const { id } = await contexto.params;
  const usuario = mockUsuarios.find((u) => u.id === id);
  if (!usuario) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Usuário não encontrado." },
      { status: 404 },
    );
  }
  return NextResponse.json({
    ...usuario,
    escola: usuario.escolaId
      ? mockEscolas.find((e) => e.id === usuario.escolaId)?.nome
      : null,
  });
}

export async function PATCH(
  request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  const { id } = await contexto.params;

  const indice = mockUsuarios.findIndex((u) => u.id === id);
  if (indice < 0) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Usuário não encontrado." },
      { status: 404 },
    );
  }
  const original = mockUsuarios[indice];

  let patch: Partial<Usuario>;
  try {
    patch = (await request.json()) as Partial<Usuario>;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo inválido." },
      { status: 400 },
    );
  }

  if (patch.email && patch.email.toLowerCase() !== original.email.toLowerCase()) {
    const emailDup = mockUsuarios.some(
      (u) =>
        u.id !== id && u.email.toLowerCase() === patch.email!.toLowerCase(),
    );
    if (emailDup) {
      return NextResponse.json(
        {
          codigo: "EMAIL_DUPLICADO",
          mensagem: "Já existe outro usuário com este email.",
        },
        { status: 409 },
      );
    }
  }

  if (patch.escolaId !== undefined && patch.escolaId !== null) {
    const existe = mockEscolas.some((e) => e.id === patch.escolaId);
    if (!existe) {
      return NextResponse.json(
        { codigo: "ESCOLA_INVALIDA", mensagem: "Escola não encontrada." },
        { status: 422 },
      );
    }
  }

  // muta IN-PLACE pra persistir entre requisições (mocks são em memória do server)
  const ativoAntes = original.ativo;
  Object.assign(original, patch, {
    id: original.id,
    atualizadoEm: new Date().toISOString(),
  });

  // monta descrição amigável pra trilha de auditoria
  let detalhes = "Editou dados cadastrais";
  if (patch.ativo !== undefined && patch.ativo !== ativoAntes) {
    detalhes = patch.ativo
      ? `Reativou ${original.nome}`
      : `Desativou ${original.nome}`;
  } else if (patch.perfil) {
    detalhes = `Alterou perfil de ${original.nome} para ${patch.perfil}`;
  } else if (patch.nome || patch.email) {
    detalhes = `Editou cadastro de ${original.nome}`;
  }

  registrarAuditoria({
    tipo: "editar_usuario",
    usuarioId: "usu_001",
    usuarioNome: "Renata Albuquerque Cardoso",
    alvoTipo: "usuario",
    alvoId: original.id,
    detalhes,
  });

  return NextResponse.json({
    ...original,
    escola: original.escolaId
      ? mockEscolas.find((e) => e.id === original.escolaId)?.nome
      : null,
  });
}

export async function DELETE(
  _request: Request,
  contexto: ContextoRota,
): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
  const { id } = await contexto.params;

  const indice = mockUsuarios.findIndex((u) => u.id === id);
  if (indice < 0) {
    return NextResponse.json(
      { codigo: "NAO_ENCONTRADO", mensagem: "Usuário não encontrado." },
      { status: 404 },
    );
  }

  const removido = mockUsuarios.splice(indice, 1)[0];

  registrarAuditoria({
    tipo: "remover_usuario",
    usuarioId: "usu_001",
    usuarioNome: "Renata Albuquerque Cardoso",
    alvoTipo: "usuario",
    alvoId: id,
    detalhes: `Excluiu definitivamente o usuário ${removido.nome} (${removido.email})`,
  });

  return NextResponse.json({ id, removido: true });
}
