"""Aplicação FastAPI — API do Banco de Questões (SEDUC Simulados).

A lógica de negócio fica nas camadas de domínio, serviços e rotas específicas.
Este módulo apenas monta a aplicação HTTP, registra routers e expõe healthcheck.
"""

import logging
import os
from time import perf_counter
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.deps import get_session
from app.api.permissoes import so_admin
from app.api.routers import (
    aluno,
    assuntos,
    auditoria,
    auth,
    avisos,
    cadastro,
    calendario,
    configuracoes,
    estrutura,
    etapas,
    etiquetas,
    ia,
    importacao,
    notificacoes,
    painel,
    publico,
    provas,
    questoes,
    respostas,
    simulados,
    usuarios,
)
from app.database import engine
from app.models import Usuario
from app.services import auditoria_service, diagnostico_service

logger = logging.getLogger("sedu.api")
PREFIXO_BACKEND_VERCEL = "/_/backend"


def _origens_cors() -> list[str]:
    bruto = os.environ.get("CORS_ORIGINS")
    if bruto:
        return [origem.strip() for origem in bruto.split(",") if origem.strip()]

    origens = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://simulados-sedu.vercel.app",
        "https://simulados-sedu-tempestt.vercel.app",
    ]
    vercel_url = os.environ.get("VERCEL_URL")
    if vercel_url:
        origens.append(f"https://{vercel_url}")
    return origens

app = FastAPI(
    title="SEDUC Simulados — API do Banco de Questões",
    description=(
        "Backend do Sistema de Simulados Educacionais com IA (SEDUC-SE). "
        "Endpoints para autenticação, simulados, questões, provas e painéis."
    ),
    version="0.1.0",
)

# CORS liberado em desenvolvimento. Em produção, restringir allow_origins ao
# domínio real do frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origens_cors(),
    allow_methods=["*"],
    allow_headers=["*"],
)


def _normalizar_prefixo_backend_vercel(request: Request) -> str:
    """Aceita chamadas diretas pelo prefixo publico do backend na Vercel."""
    path_original = str(request.scope.get("path") or "")
    if path_original == PREFIXO_BACKEND_VERCEL:
        novo_path = "/"
    elif path_original.startswith(f"{PREFIXO_BACKEND_VERCEL}/"):
        novo_path = path_original[len(PREFIXO_BACKEND_VERCEL) :] or "/"
    else:
        return path_original

    request.scope["path"] = novo_path
    raw_path = request.scope.get("raw_path")
    if isinstance(raw_path, bytes):
        prefixo = PREFIXO_BACKEND_VERCEL.encode()
        if raw_path == prefixo:
            request.scope["raw_path"] = b"/"
        elif raw_path.startswith(prefixo + b"/"):
            request.scope["raw_path"] = raw_path[len(prefixo) :] or b"/"
    return path_original


@app.middleware("http")
async def adicionar_observabilidade(request: Request, call_next):
    path_original = _normalizar_prefixo_backend_vercel(request)
    inicio = perf_counter()
    request_id = request.headers.get("x-request-id") or str(uuid4())
    try:
        resposta = await call_next(request)
    except Exception:
        duracao_ms = (perf_counter() - inicio) * 1000
        logger.exception(
            "request_id=%s method=%s path=%s status=500 duration_ms=%.2f",
            request_id,
            request.method,
            path_original,
            duracao_ms,
        )
        raise

    duracao_ms = (perf_counter() - inicio) * 1000
    resposta.headers["x-request-id"] = request_id
    resposta.headers["x-response-time-ms"] = f"{duracao_ms:.2f}"
    logger.info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        request_id,
        request.method,
        path_original,
        resposta.status_code,
        duracao_ms,
    )
    return resposta


@app.exception_handler(RequestValidationError)
async def tratar_erro_validacao(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    campos = [
        {
            "campo": ".".join(str(parte) for parte in erro.get("loc", [])),
            "mensagem": erro.get("msg", "Valor inválido."),
            "tipo": erro.get("type", "validacao"),
        }
        for erro in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "codigo": "VALIDACAO",
            "mensagem": "Dados inválidos. Confira os campos enviados.",
            "detalhes": campos,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def tratar_erro_http(
    _request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        codigo = str(detail.get("codigo", "ERRO_HTTP"))
        mensagem = str(detail.get("mensagem", detail.get("detail", "Erro na requisição.")))
        detalhes = detail.get("detalhes")
    else:
        codigo = "ERRO_HTTP"
        mensagem = str(detail or "Erro na requisição.")
        detalhes = None

    if exc.status_code == 401:
        codigo = "NAO_AUTENTICADO"
    elif exc.status_code == 403:
        codigo = "SEM_PERMISSAO"
    elif exc.status_code == 404:
        codigo = "NAO_ENCONTRADO"
    elif exc.status_code == 409:
        codigo = "CONFLITO"
    elif exc.status_code == 429:
        codigo = "MUITAS_TENTATIVAS"

    content = {"codigo": codigo, "mensagem": mensagem}
    if detalhes is not None:
        content["detalhes"] = detalhes
    return JSONResponse(status_code=exc.status_code, content=content)

app.include_router(auth.router)
app.include_router(cadastro.router)
app.include_router(estrutura.router)
app.include_router(usuarios.router)
app.include_router(etiquetas.router)
app.include_router(ia.router)
app.include_router(questoes.router)
app.include_router(importacao.router)
app.include_router(provas.router)
app.include_router(simulados.router)
app.include_router(respostas.router)
app.include_router(etapas.router)
app.include_router(avisos.router)
app.include_router(calendario.router)
app.include_router(configuracoes.router)
app.include_router(assuntos.router)
app.include_router(aluno.router)
app.include_router(notificacoes.router)
app.include_router(auditoria.router)
app.include_router(painel.router)
app.include_router(publico.router)


@app.get("/health", tags=["status"])
def health() -> dict:
    """Healthcheck simples."""
    return {"projeto": "SEDUC Simulados — Banco de Questões", "status": "online"}

@app.get("/health/detalhado", tags=["status"])
def health_detalhado() -> dict:
    """Healthcheck com ping real no banco, sem expor credenciais."""
    inicio = perf_counter()
    banco = {"status": "online", "latenciaMs": 0.0, "dialeto": engine.dialect.name}
    try:
        with engine.connect() as conexao:
            conexao.execute(text("SELECT 1"))
    except Exception as exc:
        banco = {
            "status": "offline",
            "latenciaMs": round((perf_counter() - inicio) * 1000, 2),
            "dialeto": engine.dialect.name,
            "erro": exc.__class__.__name__,
        }
    else:
        banco["latenciaMs"] = round((perf_counter() - inicio) * 1000, 2)

    return {
        "projeto": "SEDUC Simulados - Banco de Questoes",
        "status": "online" if banco["status"] == "online" else "degradado",
        "api": {"status": "online"},
        "banco": banco,
    }


@app.get("/diagnostico", tags=["status"], dependencies=[Depends(so_admin)])
def diagnostico_admin(
    _usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    """Diagnostico protegido da saude operacional e integridade do banco."""
    return diagnostico_service.gerar_diagnostico(sessao)


@app.post("/diagnostico/reparar-snapshots", tags=["status"], dependencies=[Depends(so_admin)])
def reparar_snapshots_admin(
    request: Request,
    usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    """Cria snapshots ausentes para provas legadas ja liberadas."""
    resultado = diagnostico_service.reparar_snapshots_liberados(sessao, usuario)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="reparar_snapshots",
        alvo_tipo="diagnostico",
        alvo_id="snapshots",
        detalhes=(
            f"Reparou {resultado['totalReparados']} snapshots ausentes; "
            f"ignorou {resultado['totalIgnorados']} provas."
        ),
        request=request,
    )
    sessao.commit()
    return resultado
