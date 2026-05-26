import { NextResponse } from "next/server";
import { mockUsuarios, mockUsuariosPorPerfil } from "@/lib/mocks";
import type { PerfilUsuario, UsuarioAutenticado } from "@/types";

interface CorpoLogin {
  email?: string;
  senha?: string;
  perfilDev?: PerfilUsuario;
}

export async function POST(request: Request): Promise<NextResponse> {
  let corpo: CorpoLogin;
  try {
    corpo = (await request.json()) as CorpoLogin;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  // simula latência leve pra parecer real
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  let usuario =
    corpo.perfilDev && mockUsuariosPorPerfil
      ? mockUsuariosPorPerfil[corpo.perfilDev]
      : undefined;

  if (!usuario && corpo.email) {
    const emailNormalizado = corpo.email.toLowerCase();
    usuario = mockUsuarios.find(
      (u) => u.email.toLowerCase() === emailNormalizado,
    );
  }

  if (!usuario) {
    return NextResponse.json(
      {
        codigo: "CREDENCIAIS_INVALIDAS",
        mensagem:
          "Email não encontrado. Em modo de desenvolvimento, use os botões de acesso rápido abaixo do form.",
      },
      { status: 401 },
    );
  }

  const token = `mock.${usuario.id}.${Date.now()}`;
  const expiraEm = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const autenticado: UsuarioAutenticado = { ...usuario, token, expiraEm };

  return NextResponse.json({ usuario: autenticado, token });
}
