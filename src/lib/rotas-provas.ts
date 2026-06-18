import type { PerfilUsuario } from "@/types";

export function baseProvasPorPerfil(
  perfil?: PerfilUsuario | null,
  pathname?: string | null,
): string {
  const perfilEfetivo = perfil ?? perfilPorCaminho(pathname);
  if (perfilEfetivo === "admin") return "/admin/provas";
  if (perfilEfetivo === "professor") return "/professor/provas";
  return "/gestor/simulados";
}

export function novaProvaPorPerfil(
  perfil?: PerfilUsuario | null,
  id?: string,
  pathname?: string | null,
): string {
  const perfilEfetivo = perfil ?? perfilPorCaminho(pathname);
  const base = baseProvasPorPerfil(perfilEfetivo, pathname);
  const caminho =
    perfilEfetivo === "admin" || perfilEfetivo === "professor"
      ? `${base}/nova`
      : `${base}/novo`;
  return id ? `${caminho}?id=${id}` : caminho;
}

function perfilPorCaminho(pathname?: string | null): PerfilUsuario | null {
  if (!pathname) return null;
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/professor")) return "professor";
  if (pathname.startsWith("/gestor")) return "gestor";
  return null;
}
