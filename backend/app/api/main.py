"""Aplicação FastAPI — API do Banco de Questões (SEDUC Simulados).

A lógica de negócio fica nas camadas de domínio, serviços e rotas específicas.
Este módulo apenas monta a aplicação HTTP, registra routers e expõe healthcheck.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import (
    aluno,
    assuntos,
    auditoria,
    auth,
    avisos,
    cadastro,
    calendario,
    estrutura,
    etapas,
    etiquetas,
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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cadastro.router)
app.include_router(estrutura.router)
app.include_router(usuarios.router)
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
app.include_router(notificacoes.router)
app.include_router(auditoria.router)
app.include_router(painel.router)
app.include_router(publico.router)


@app.get("/health", tags=["status"])
def health() -> dict:
    """Healthcheck simples."""
    return {"projeto": "SEDUC Simulados — Banco de Questões", "status": "online"}
