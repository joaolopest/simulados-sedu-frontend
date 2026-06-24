from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session, obter_usuario_atual
from app.config import settings
from app.exceptions import PermissaoNegada
from app.models import Usuario
from app.repositories import usuario_repository
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["autenticacao"])


class LoginRequest(BaseModel):
    email: str = Field(..., description="E-mail do usuário", examples=["admin@sedu.se.gov.br"])
    senha: str = Field(..., description="Senha do usuário", examples=["sedu123"])


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    perfil: str


class TokenOut(BaseModel):
    token: str
    tipo: str = "Bearer"
    expira_em_horas: int
    usuario: UsuarioOut


@router.post("/login", response_model=TokenOut, summary="Fazer login e receber o token de acesso")
def login(req: LoginRequest, sessao: Session = Depends(get_session)) -> TokenOut:
    usuario = usuario_repository.buscar_por_email(sessao, req.email)
    if usuario is None or not auth_service.verificar_senha(req.senha, usuario.senha_hash):
        raise PermissaoNegada("E-mail ou senha inválidos", codigo="credenciais_invalidas")
    token = auth_service.criar_token(usuario.id, usuario.perfil.value)
    return TokenOut(
        token=token,
        expira_em_horas=settings.jwt_expira_horas,
        usuario=UsuarioOut(
            id=usuario.id,
            nome=usuario.nome,
            email=usuario.email,
            perfil=usuario.perfil.value,
        ),
    )


@router.get("/me", response_model=UsuarioOut, summary="Ver os dados do usuário autenticado")
def usuario_logado(usuario: Usuario = Depends(obter_usuario_atual)) -> UsuarioOut:
    return UsuarioOut(
        id=usuario.id, nome=usuario.nome, email=usuario.email, perfil=usuario.perfil.value
    )
