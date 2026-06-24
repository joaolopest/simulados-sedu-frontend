from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from app.api.routers import (
    auth,
    etiquetas,
    importacao,
    provas,
    questoes,
    respostas,
    simulados,
    turmas,
)
from app.config import settings
from app.exceptions import ErroDominio

app = FastAPI(
    title="SEDUC Simulados — API do Banco de Questões",
    description=(
        "Backend do Sistema de Simulados Educacionais com IA (SEDUC-SE). "
        "Autenticação JWT por perfil (admin, gestor, aluno, suporte); "
        "banco de questões, geração de provas e ciclo de simulado."
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ErroDominio)
async def _tratar_erro_dominio(request: Request, exc: ErroDominio) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_http,
        content={"codigo": exc.codigo, "mensagem": exc.mensagem},
    )


@app.exception_handler(RequestValidationError)
async def _tratar_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "codigo": "dados_invalidos",
            "mensagem": "Dados da requisição inválidos.",
            "detalhes": jsonable_encoder(exc.errors()),
        },
    )


app.include_router(auth.router)
app.include_router(etiquetas.router)
app.include_router(questoes.router)
app.include_router(importacao.router)
app.include_router(provas.router)
app.include_router(simulados.router)
app.include_router(respostas.router)
app.include_router(turmas.router)


_DEMO_PATH = Path(__file__).resolve().parent.parent / "static" / "demo.html"


@app.get("/health", tags=["status"])
def health() -> dict:
    return {
        "projeto": "SEDUC Simulados — Banco de Questões",
        "status": "online",
        "ambiente": settings.ambiente,
    }


if settings.demo_habilitado:

    @app.get("/", response_class=HTMLResponse, tags=["demo"])
    def home() -> str:
        return _DEMO_PATH.read_text(encoding="utf-8")

else:

    @app.get("/", tags=["status"])
    def raiz() -> dict:
        return {"projeto": "SEDUC Simulados", "documentacao": "/docs"}
