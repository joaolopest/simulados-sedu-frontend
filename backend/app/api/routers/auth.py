"""Endpoints de autenticação.

    POST /auth/login    autentica por email + senha
    POST /auth/logout   (no-op no mock — token sem estado)
    GET  /auth/me       devolve usuário autenticado pelo header
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models import Usuario
from app.services.seguranca import gerar_token_sessao, verificar_senha

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5)
    senha: str = Field(..., min_length=6)


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    perfil: str
    ativo: bool

    @classmethod
    def from_modelo(cls, u: Usuario) -> "UsuarioOut":
        return cls(
            id=u.id,
            nome=u.nome,
            email=u.email,
            perfil=u.perfil.value,
            ativo=u.ativo,
        )


class LoginResponse(BaseModel):
    usuario: UsuarioOut
    token: str


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, sessao: Session = Depends(get_session)) -> LoginResponse:
    usuario = (
        sessao.query(Usuario).filter(Usuario.email == req.email.lower()).one_or_none()
    )
    if not usuario or not usuario.ativo:
        raise HTTPException(
            status_code=401,
            detail={
                "codigo": "CREDENCIAIS_INVALIDAS",
                "mensagem": "Email ou senha incorretos.",
            },
        )
    if not verificar_senha(req.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=401,
            detail={
                "codigo": "CREDENCIAIS_INVALIDAS",
                "mensagem": "Email ou senha incorretos.",
            },
        )

    token = gerar_token_sessao(usuario.id)
    return LoginResponse(usuario=UsuarioOut.from_modelo(usuario), token=token)


@router.post("/logout")
def logout() -> dict:
    return {"ok": True}


@router.get("/me", response_model=UsuarioOut)
def me(
    authorization: str | None = Header(None),
    sessao: Session = Depends(get_session),
) -> UsuarioOut:
    """Devolve o usuário do token. Formato simplificado: 'Bearer mock.<id>.<rand>'."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token ausente.")
    token = authorization.split(" ", 1)[1]
    partes = token.split(".")
    if len(partes) < 3 or partes[0] != "mock":
        raise HTTPException(status_code=401, detail="Token inválido.")
    try:
        usuario_id = int(partes[1])
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Token inválido.") from exc
    usuario = sessao.get(Usuario, usuario_id)
    if not usuario or not usuario.ativo:
        raise HTTPException(status_code=401, detail="Sessão expirada.")
    return UsuarioOut.from_modelo(usuario)
