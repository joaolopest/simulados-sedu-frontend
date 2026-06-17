import { NextResponse } from "next/server";
import { backendFetch, ErroBackend } from "@/lib/backend";
import { mapUsuario, type UsuarioBackend } from "@/lib/backend-maps";
import type { PerfilUsuario, UsuarioAutenticado } from "@/types";

interface CorpoLogin {
  email?: string;
  senha?: string;
  perfilDev?: PerfilUsuario;
}

interface RespostaLoginBackend {
  token: string;
  tipo: string;
  expira_em_horas: number;
  usuario: UsuarioBackend;
}

// Botões de "acesso rápido" (dev) entram com o usuário-semente de cada perfil
// (criados no seed, todos com senha sedu123).
const EMAIL_SEMENTE: Partial<Record<PerfilUsuario, string>> = {
  admin: "admin@sedu.se.gov.br",
  gestor: "gestor@sedu.se.gov.br",
  professor: "professor@sedu.se.gov.br",
  suporte: "roberto.nogueira@sedu.es.gov.br",
  aluno: "aluno@sedu.se.gov.br",
  candidato: "candidato@sedu.se.gov.br",
};
const SENHA_SEMENTE = "sedu123";

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

  let email = corpo.email;
  let senha = corpo.senha;
  if (corpo.perfilDev) {
    email = EMAIL_SEMENTE[corpo.perfilDev];
    senha = SENHA_SEMENTE;
    if (!email) {
      return NextResponse.json(
        { codigo: "PERFIL_INVALIDO", mensagem: "Perfil de desenvolvimento inválido." },
        { status: 400 },
      );
    }
  }

  if (!email || !senha) {
    return NextResponse.json(
      { codigo: "CREDENCIAIS_AUSENTES", mensagem: "Informe e-mail e senha." },
      { status: 400 },
    );
  }

  try {
    const resp = await backendFetch<RespostaLoginBackend>("/auth/login", {
      method: "POST",
      body: { email, senha },
    });
    const expiraEm = new Date(
      Date.now() + (resp.expira_em_horas ?? 8) * 60 * 60 * 1000,
    ).toISOString();
    const usuario: UsuarioAutenticado = {
      ...mapUsuario(resp.usuario),
      token: resp.token,
      expiraEm,
    };
    return NextResponse.json({ usuario, token: resp.token });
  } catch (erro) {
    if (erro instanceof ErroBackend) {
      // 401 do Python = e-mail/senha inválidos; repassamos status e mensagem.
      return NextResponse.json(erro.corpo, { status: erro.status });
    }
    return NextResponse.json(
      { codigo: "ERRO_DESCONHECIDO", mensagem: "Falha ao autenticar." },
      { status: 500 },
    );
  }
}
