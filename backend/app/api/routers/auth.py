from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models import Usuario
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["autenticacao"])

seguranca = HTTPBearer(auto_error=True, description="Cole aqui o token recebido no login")


class LoginRequest(BaseModel):
    email: str = Field(..., description="E-mail do usuário", examples=["admin@sedu.se.gov.br"])
    senha: str = Field(..., description="Senha do usuário", examples=["sedu123"])


def obter_usuario_atual(
    credenciais: HTTPAuthorizationCredentials = Depends(seguranca),
    sessao: Session = Depends(get_session),
) -> Usuario:
    try:
        dados = auth_service.decodificar_token(credenciais.credentials)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado") from exc
    usuario = sessao.get(Usuario, int(dados.get("sub", 0)))
    if usuario is None or not usuario.ativo:
        raise HTTPException(status_code=401, detail="Usuário não encontrado ou inativo")
    return usuario


@router.post("/login", summary="Fazer login e receber o token de acesso")
def login(req: LoginRequest, sessao: Session = Depends(get_session)) -> dict:
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == req.email))
    if usuario is None or not auth_service.verificar_senha(req.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = auth_service.criar_token(usuario.id, usuario.perfil.value)
    return {
        "token": token,
        "tipo": "Bearer",
        "expira_em_horas": auth_service.HORAS_VALIDADE,
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "perfil": usuario.perfil.value,
        },
    }


@router.get("/me", summary="Ver os dados do usuário autenticado (rota protegida)")
def usuario_logado(usuario: Usuario = Depends(obter_usuario_atual)) -> dict:
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil.value,
    }
