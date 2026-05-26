import { NextResponse, type NextRequest } from "next/server";
import type { PerfilUsuario } from "@/types";

const ROTAS_PUBLICAS = ["/login", "/recuperar-senha", "/primeiro-acesso"];
const ROTAS_COMPARTILHADAS = ["/perfil", "/notificacoes", "/configuracoes"];

const PREFIXO_POR_PERFIL: Record<PerfilUsuario, string> = {
  admin: "/admin",
  gestor: "/gestor",
  aluno: "/aluno",
  suporte: "/suporte",
};

const HOME_POR_PERFIL: Record<PerfilUsuario, string> = {
  admin: "/admin/dashboard",
  gestor: "/gestor/dashboard",
  aluno: "/aluno/home",
  suporte: "/suporte/dashboard",
};

const PERFIS_VALIDOS = new Set<PerfilUsuario>([
  "admin",
  "gestor",
  "aluno",
  "suporte",
]);

function ehPerfilValido(valor: string | undefined): valor is PerfilUsuario {
  return typeof valor === "string" && PERFIS_VALIDOS.has(valor as PerfilUsuario);
}

function rotaEhPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}

function rotaEhCompartilhada(pathname: string): boolean {
  return ROTAS_COMPARTILHADAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}

function prefixoDaRota(pathname: string): string | null {
  for (const [perfil, prefixo] of Object.entries(PREFIXO_POR_PERFIL)) {
    if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) {
      return PREFIXO_POR_PERFIL[perfil as PerfilUsuario];
    }
  }
  return null;
}

function perfilDoPrefixo(prefixo: string): PerfilUsuario | null {
  for (const [perfil, valor] of Object.entries(PREFIXO_POR_PERFIL)) {
    if (valor === prefixo) return perfil as PerfilUsuario;
  }
  return null;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("sedu-token")?.value;
  const perfilCookie = request.cookies.get("sedu-perfil")?.value;
  const autenticado = Boolean(token) && ehPerfilValido(perfilCookie);
  const perfil: PerfilUsuario | null = autenticado
    ? (perfilCookie as PerfilUsuario)
    : null;

  // Raiz: landing page pública — passa direto. Botão "Entrar" leva pro /login.
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Rotas públicas — quem está autenticado vai pra dashboard.
  if (rotaEhPublica(pathname)) {
    if (autenticado && perfil) {
      return NextResponse.redirect(
        new URL(HOME_POR_PERFIL[perfil], request.url),
      );
    }
    return NextResponse.next();
  }

  // Daqui pra baixo precisa estar autenticado.
  if (!autenticado || !perfil) {
    const url = new URL("/login", request.url);
    if (pathname !== "/login") {
      url.searchParams.set("retorno", pathname);
    }
    return NextResponse.redirect(url);
  }

  // Rotas compartilhadas — qualquer perfil autenticado entra.
  if (rotaEhCompartilhada(pathname)) {
    return NextResponse.next();
  }

  // Rotas com prefixo de perfil — só o dono entra; o resto vai pra própria home.
  const prefixo = prefixoDaRota(pathname);
  if (prefixo !== null) {
    const perfilDono = perfilDoPrefixo(prefixo);
    if (perfilDono !== perfil) {
      return NextResponse.redirect(
        new URL(HOME_POR_PERFIL[perfil], request.url),
      );
    }
    return NextResponse.next();
  }

  // Rota desconhecida pra usuário autenticado: deixa o filesystem decidir
  // (404 do Next vai cair).
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|mockServiceWorker.js).*)",
  ],
};
