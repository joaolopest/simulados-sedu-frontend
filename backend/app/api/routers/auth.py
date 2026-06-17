from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models import Usuario
from app.services import auditoria_service
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["autenticacao"])

seguranca = HTTPBearer(auto_error=True, description="Cole aqui o token recebido no login")


class LoginRequest(BaseModel):
    email: str = Field(..., description="E-mail do usuário", examples=["admin@sedu.se.gov.br"])
    senha: str = Field(..., description="Senha do usuário", examples=["sedu123"])


def _serializar_usuario_sessao(usuario: Usuario) -> dict:
    """Dados do próprio usuário autenticado, no shape que o front (BFF) espera.

    Mantém os mesmos campos de `usuarios._serializar_usuario` — duplicado aqui
    de propósito para evitar import circular (auth ← permissoes ← usuarios).
    """
    dados: dict = {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil.value,
        "ativo": usuario.ativo,
        "criado_em": usuario.criado_em.isoformat() if usuario.criado_em else None,
    }
    aluno = usuario.aluno
    if aluno is not None:
        dados["escola_id"] = aluno.turma.escola_id if aluno.turma else None
        dados["turma_id"] = aluno.turma_id
        dados["adaptacoes"] = aluno.perfil_cognitivo or []
    return dados


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
def login(
    req: LoginRequest,
    request: Request,
    sessao: Session = Depends(get_session),
) -> dict:
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == req.email))
    if usuario is None or not auth_service.verificar_senha(req.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    usuario.ultimo_acesso = datetime.now(timezone.utc)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="login",
        alvo_tipo="sessao",
        alvo_id=usuario.id,
        detalhes=f"{usuario.nome} fez login",
        request=request,
    )
    sessao.commit()
    token = auth_service.criar_token(usuario.id, usuario.perfil.value)
    return {
        "token": token,
        "tipo": "Bearer",
        "expira_em_horas": auth_service.HORAS_VALIDADE,
        "usuario": _serializar_usuario_sessao(usuario),
    }


@router.get("/me", summary="Ver os dados do usuário autenticado (rota protegida)")
def usuario_logado(usuario: Usuario = Depends(obter_usuario_atual)) -> dict:
    return _serializar_usuario_sessao(usuario)


class RecuperarSenhaRequest(BaseModel):
    email: str


@router.post("/recuperar-senha", summary="Solicitar recuperação de senha")
def recuperar_senha(
    req: RecuperarSenhaRequest, sessao: Session = Depends(get_session)
) -> dict:
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == req.email))
    if usuario is None:
        # Não vaza se o e-mail existe.
        return {"ok": True}
    token = auth_service.criar_token_reset(usuario.id)
    # Em produção, este token vai por e-mail (link de reset). Sem infra SMTP,
    # devolvemos no dev pra permitir o fluxo de ponta a ponta.
    return {"ok": True, "token": token}


class PrimeiroAcessoRequest(BaseModel):
    token: str
    novaSenha: str


@router.post("/primeiro-acesso", summary="Definir senha no primeiro acesso")
def primeiro_acesso(
    req: PrimeiroAcessoRequest, sessao: Session = Depends(get_session)
) -> dict:
    try:
        dados = auth_service.decodificar_token(req.token)
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail="Token inválido ou expirado."
        ) from exc
    if dados.get("tipo") != "reset":
        raise HTTPException(status_code=400, detail="Token inválido para redefinição.")
    if len((req.novaSenha or "").strip()) < 6:
        raise HTTPException(status_code=422, detail="Senha muito curta (mín. 6).")
    usuario = sessao.get(Usuario, int(dados.get("sub", 0)))
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    usuario.senha_hash = auth_service.gerar_hash_senha(req.novaSenha)
    sessao.commit()
    return {"ok": True}
