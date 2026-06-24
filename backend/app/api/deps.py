from collections.abc import Iterator

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.enums import PerfilUsuario
from app.exceptions import PermissaoNegada
from app.models import Usuario
from app.services import auth_service

seguranca = HTTPBearer(
    auto_error=True,
    description="Token JWT obtido em POST /auth/login (formato: Bearer <token>)",
)


def get_session() -> Iterator[Session]:
    sessao = SessionLocal()
    try:
        yield sessao
    except Exception:
        sessao.rollback()
        raise
    finally:
        sessao.close()


def obter_usuario_atual(
    credenciais: HTTPAuthorizationCredentials = Depends(seguranca),
    sessao: Session = Depends(get_session),
) -> Usuario:
    try:
        dados = auth_service.decodificar_token(credenciais.credentials)
    except Exception as exc:
        raise PermissaoNegada("Token inválido ou expirado", codigo="token_invalido") from exc

    try:
        usuario_id = int(dados.get("sub", 0))
    except (TypeError, ValueError):
        usuario_id = 0

    usuario = sessao.get(Usuario, usuario_id)
    if usuario is None or not usuario.ativo:
        raise PermissaoNegada("Usuário não encontrado ou inativo", codigo="token_invalido")
    return usuario


def require_perfis(*perfis: PerfilUsuario):
    permitidos = set(perfis)

    def dependencia(usuario: Usuario = Depends(obter_usuario_atual)) -> Usuario:
        if usuario.perfil not in permitidos:
            nomes = ", ".join(p.value for p in permitidos)
            raise PermissaoNegada(
                f"Operação restrita aos perfis: {nomes}", codigo="perfil_insuficiente"
            )
        return usuario

    return dependencia


def require_gestor(usuario: Usuario = Depends(obter_usuario_atual)) -> Usuario:
    if usuario.perfil not in {PerfilUsuario.ADMIN, PerfilUsuario.GESTOR}:
        raise PermissaoNegada(
            "Operação restrita a gestores e administradores", codigo="perfil_insuficiente"
        )
    return usuario
