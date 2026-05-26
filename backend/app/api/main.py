"""Aplicação FastAPI — API do Banco de Questões (SEDUC Simulados).

Esta é a "casca" HTTP. A lógica de verdade está nas camadas:
    app/repositories/  -> acesso ao banco
    app/services/      -> regra de negócio (geração de prova)

Rodar localmente:
    uvicorn app.api.main:app --reload

Páginas:
    /        -> demo web (interface de demonstração da integração)
    /docs    -> Swagger (documentação interativa, gerada automaticamente)
    /health  -> healthcheck JSON
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.api.routers import (
    aluno,
    assuntos,
    auth,
    avisos,
    cadastro,
    calendario,
    demo,
    estrutura,
    etapas,
    etiquetas,
    importacao,
    provas,
    questoes,
    respostas,
    simulados,
)

app = FastAPI(
    title="SEDUC Simulados — API do Banco de Questões",
    description=(
        "Backend do Sistema de Simulados Educacionais com IA (SEDUC-SE). "
        "Endpoints para consultar etiquetas, filtrar questões e gerar provas."
    ),
    version="0.1.0",
)

# CORS liberado em desenvolvimento — permite que o frontend (Next.js em outra
# porta) consuma a API. Em produção, restringir allow_origins ao domínio real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cadastro.router)
app.include_router(estrutura.router)
app.include_router(etiquetas.router)
app.include_router(questoes.router)
app.include_router(importacao.router)
app.include_router(provas.router)
app.include_router(simulados.router)
app.include_router(respostas.router)
app.include_router(etapas.router)
app.include_router(avisos.router)
app.include_router(calendario.router)
app.include_router(assuntos.router)
app.include_router(aluno.router)
app.include_router(demo.router)

# main.py está em app/api/, então sobe dois níveis até app/ e entra em static/
_DEMO_PATH = Path(__file__).resolve().parent.parent / "static" / "demo.html"


@app.get("/", response_class=HTMLResponse, tags=["demo"])
def home() -> str:
    """Serve a página de demonstração da integração back+front."""
    return _DEMO_PATH.read_text(encoding="utf-8")


@app.get("/health", tags=["status"])
def health() -> dict:
    """Healthcheck simples."""
    return {"projeto": "SEDUC Simulados — Banco de Questões", "status": "online"}
