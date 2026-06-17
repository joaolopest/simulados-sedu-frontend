import { NextResponse } from "next/server";
import { backendFetch, ErroBackend, tokenDaRequisicao } from "@/lib/backend";
import { mapUsuario, type UsuarioBackend } from "@/lib/backend-maps";

export async function GET(request: Request): Promise<NextResponse> {
  const token = tokenDaRequisicao(request);
  if (!token) {
    return NextResponse.json(
      { codigo: "NAO_AUTENTICADO", mensagem: "Token ausente." },
      { status: 401 },
    );
  }

  try {
    const py = await backendFetch<UsuarioBackend>("/auth/me", { token });
    return NextResponse.json(mapUsuario(py));
  } catch (erro) {
    if (erro instanceof ErroBackend) {
      return NextResponse.json(erro.corpo, { status: erro.status });
    }
    return NextResponse.json(
      { codigo: "ERRO_DESCONHECIDO", mensagem: "Falha ao validar a sessão." },
      { status: 500 },
    );
  }
}
