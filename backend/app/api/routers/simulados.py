"""Endpoints do ciclo de simulado (Épicos 4-6).

    POST /simulados              cria o simulado (gestor)
    POST /simulados/{id}/gerar   gera a seleção de questões e persiste
    GET  /simulados/{id}/preview prévia COM gabarito (gestor)
    POST /simulados/{id}/liberar libera para os alunos
    GET  /simulados/{id}/questoes questões SEM gabarito (aluno)
    POST /simulados/{id}/finalizar encerra e calcula notas
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.services import simulado_service

router = APIRouter(prefix="/simulados", tags=["simulados"])


class CriarSimuladoRequest(BaseModel):
    gestor_id: int
    turma_id: int
    titulo: str = Field(..., examples=["Simulado de Matemática - 9º ano"])
    serie: str = Field(..., examples=["9º ano"])
    materia: str = Field(..., examples=["Matemática"])
    conteudos: list[str] | None = None
    distribuicao: dict[str, float] | None = Field(
        None, examples=[{"Fácil": 0.3, "Médio": 0.5, "Difícil": 0.2}]
    )
    quantidade: int = Field(10, ge=1, le=100)
    adaptacoes: list[str] | None = None
    seed: int | None = None


class GerarRequest(BaseModel):
    seed: int | None = Field(None, description="Fixa o sorteio (reproduzível)")


def _resumo(simulado) -> dict:
    return {
        "id": simulado.id,
        "titulo": simulado.titulo,
        "status": simulado.status.value,
        "turma_id": simulado.turma_id,
        "gestor_id": simulado.gestor_id,
        "total_questoes": len(simulado.questoes),
        "parametros": simulado.parametros_json,
    }


@router.post("")
def criar_simulado(
    req: CriarSimuladoRequest, sessao: Session = Depends(get_session)
) -> dict:
    parametros = {
        "serie": req.serie,
        "materia": req.materia,
        "conteudos": req.conteudos,
        "distribuicao": req.distribuicao,
        "quantidade": req.quantidade,
        "adaptacoes": req.adaptacoes,
        "seed": req.seed,
    }
    simulado = simulado_service.criar_simulado(
        sessao,
        gestor_id=req.gestor_id,
        turma_id=req.turma_id,
        titulo=req.titulo,
        parametros=parametros,
    )
    return _resumo(simulado)


@router.post("/{simulado_id}/gerar")
def gerar(
    simulado_id: int, req: GerarRequest, sessao: Session = Depends(get_session)
) -> dict:
    try:
        simulado = simulado_service.gerar_e_persistir(
            sessao, simulado_id=simulado_id, seed=req.seed
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _resumo(simulado)


@router.get("/{simulado_id}/preview")
def preview(simulado_id: int, sessao: Session = Depends(get_session)) -> dict:
    try:
        questoes = simulado_service.montar_questoes(
            sessao, simulado_id=simulado_id, incluir_gabarito=True
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"simulado_id": simulado_id, "questoes": questoes}


@router.post("/{simulado_id}/liberar")
def liberar(simulado_id: int, sessao: Session = Depends(get_session)) -> dict:
    try:
        simulado = simulado_service.liberar(sessao, simulado_id=simulado_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _resumo(simulado)


@router.get("/{simulado_id}/questoes")
def questoes_do_aluno(
    simulado_id: int, sessao: Session = Depends(get_session)
) -> dict:
    try:
        questoes = simulado_service.montar_questoes(
            sessao, simulado_id=simulado_id, incluir_gabarito=False
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"simulado_id": simulado_id, "questoes": questoes}


@router.post("/{simulado_id}/finalizar")
def finalizar(simulado_id: int, sessao: Session = Depends(get_session)) -> dict:
    try:
        return simulado_service.finalizar_e_corrigir(sessao, simulado_id=simulado_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
