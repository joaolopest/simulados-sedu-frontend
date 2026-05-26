import { NextResponse } from "next/server";
import { mockUsuarios } from "@/lib/mocks";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json(
      { codigo: "NAO_AUTENTICADO", mensagem: "Token ausente." },
      { status: 401 },
    );
  }

  const token = auth.slice(7);
  // formato esperado: mock.{usuarioId}.{timestamp}
  const partes = token.split(".");
  if (partes.length !== 3 || partes[0] !== "mock") {
    return NextResponse.json(
      { codigo: "TOKEN_INVALIDO", mensagem: "Token mal-formado." },
      { status: 401 },
    );
  }

  const usuario = mockUsuarios.find((u) => u.id === partes[1]);
  if (!usuario) {
    return NextResponse.json(
      { codigo: "NAO_AUTENTICADO", mensagem: "Usuário não encontrado." },
      { status: 401 },
    );
  }

  return NextResponse.json(usuario);
}
