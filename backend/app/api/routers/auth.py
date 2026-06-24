from datetime import datetime, timezone
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import PerfilUsuario, VinculoAluno
from app.models import Aluno, Usuario
from app.services import auditoria_service
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["autenticacao"])

seguranca = HTTPBearer(auto_error=True, description="Cole aqui o token recebido no login")
JANELA_RATE_LIMIT_SEGUNDOS = 300
LIMITE_LOGIN = 10
LIMITE_RECUPERACAO = 5
_TENTATIVAS_RATE_LIMIT: dict[str, tuple[int, float]] = {}


class LoginRequest(BaseModel):
    email: str = Field(..., description="E-mail do usuário", examples=["admin@sedu.se.gov.br"])
    senha: str = Field(..., description="Senha do usuário", examples=["sedu123"])


def _ip_cliente(request: Request) -> str:
    encaminhado = request.headers.get("x-forwarded-for")
    if encaminhado:
        return encaminhado.split(",", 1)[0].strip()
    return request.client.host if request.client else "desconhecido"


def _chave_rate_limit(request: Request, acao: str, identificador: str) -> str:
    return f"{acao}:{_ip_cliente(request)}:{identificador.strip().lower()}"


def _verificar_rate_limit(chave: str, limite: int) -> None:
    agora = monotonic()
    tentativas, expira_em = _TENTATIVAS_RATE_LIMIT.get(
        chave, (0, agora + JANELA_RATE_LIMIT_SEGUNDOS)
    )
    if agora > expira_em:
        _TENTATIVAS_RATE_LIMIT[chave] = (0, agora + JANELA_RATE_LIMIT_SEGUNDOS)
        return
    if tentativas >= limite:
        raise HTTPException(
            status_code=429,
            detail={
                "codigo": "MUITAS_TENTATIVAS",
                "mensagem": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
            },
        )


def _registrar_falha_rate_limit(chave: str) -> None:
    agora = monotonic()
    tentativas, expira_em = _TENTATIVAS_RATE_LIMIT.get(
        chave, (0, agora + JANELA_RATE_LIMIT_SEGUNDOS)
    )
    if agora > expira_em:
        tentativas = 0
        expira_em = agora + JANELA_RATE_LIMIT_SEGUNDOS
    _TENTATIVAS_RATE_LIMIT[chave] = (tentativas + 1, expira_em)


def _limpar_rate_limit(chave: str) -> None:
    _TENTATIVAS_RATE_LIMIT.pop(chave, None)


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
        dados["escola_id"] = aluno.turma.escola_id if aluno.turma else usuario.escola_id
        dados["turma_id"] = aluno.turma_id
        dados["adaptacoes"] = aluno.perfil_cognitivo or []
    elif usuario.escola_id is not None:
        dados["escola_id"] = usuario.escola_id
    return dados


def _garantir_aluno_candidato(sessao: Session, usuario: Usuario) -> None:
    if usuario.perfil == PerfilUsuario.CANDIDATO and usuario.aluno is None:
        usuario.aluno = Aluno(vinculo=VinculoAluno.SUPLETIVO)
        sessao.flush()


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
    chave_limite = _chave_rate_limit(request, "login", req.email)
    _verificar_rate_limit(chave_limite, LIMITE_LOGIN)
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == req.email))
    if usuario is None or not auth_service.verificar_senha(req.senha, usuario.senha_hash):
        _registrar_falha_rate_limit(chave_limite)
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    # Barra contas inativas já no login (em vez de deixar logar e dar erro depois).
    if not usuario.ativo:
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "CONTA_INATIVA",
                "mensagem": "Sua conta está inativa. Procure a secretaria da sua escola.",
            },
        )
    _limpar_rate_limit(chave_limite)
    _garantir_aluno_candidato(sessao, usuario)
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
    req: RecuperarSenhaRequest,
    request: Request,
    sessao: Session = Depends(get_session),
) -> dict:
    chave_limite = _chave_rate_limit(request, "recuperar_senha", req.email)
    _verificar_rate_limit(chave_limite, LIMITE_RECUPERACAO)
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == req.email))
    if usuario is None:
        # Não vaza se o e-mail existe.
        _registrar_falha_rate_limit(chave_limite)
        return {"ok": True}
    token = auth_service.criar_token_reset(usuario.id)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="solicitar_recuperacao_senha",
        alvo_tipo="usuario",
        alvo_id=usuario.id,
        detalhes="Solicitou recuperacao de senha.",
        request=request,
    )
    sessao.commit()
    _registrar_falha_rate_limit(chave_limite)
    # Em produção, este token vai por e-mail (link de reset). Sem infra SMTP,
    # devolvemos no dev pra permitir o fluxo de ponta a ponta.
    return {"ok": True, "token": token}


class PrimeiroAcessoRequest(BaseModel):
    token: str
    novaSenha: str


@router.post("/primeiro-acesso", summary="Definir senha no primeiro acesso")
def primeiro_acesso(
    req: PrimeiroAcessoRequest,
    request: Request,
    sessao: Session = Depends(get_session),
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
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="redefinir_senha",
        alvo_tipo="usuario",
        alvo_id=usuario.id,
        detalhes="Redefiniu senha por token de recuperacao.",
        request=request,
    )
    sessao.commit()
    return {"ok": True}
