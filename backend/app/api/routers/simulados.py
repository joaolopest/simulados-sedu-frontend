from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session, obter_usuario_atual, require_gestor
from app.models import Usuario
from app.services import simulado_service

router = APIRouter(prefix="/simulados", tags=["simulados"])


class CriarSimuladoRequest(BaseModel):
    turma_id: int
    titulo: str = Field(..., examples=["Simulado de Matemática - 9º ano"])
    serie: str = Field(..., examples=["9º ano"])
    materia: str | None = Field(None, examples=["Matemática"])
    materias: list[str] | None = Field(None, examples=[["Matemática", "Português"]])
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


@router.post("", status_code=status.HTTP_201_CREATED, summary="Criar simulado (gestor)")
def criar_simulado(
    req: CriarSimuladoRequest,
    usuario: Usuario = Depends(require_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    parametros = {
        "serie": req.serie,
        "materia": req.materia,
        "materias": req.materias,
        "conteudos": req.conteudos,
        "distribuicao": req.distribuicao,
        "quantidade": req.quantidade,
        "adaptacoes": req.adaptacoes,
        "seed": req.seed,
    }
    simulado = simulado_service.criar_simulado(
        sessao,
        gestor_id=usuario.id,
        turma_id=req.turma_id,
        titulo=req.titulo,
        parametros=parametros,
    )
    return _resumo(simulado)


@router.post("/{simulado_id}/gerar", summary="Gerar e persistir as questões (gestor)")
def gerar(
    simulado_id: int,
    req: GerarRequest,
    usuario: Usuario = Depends(require_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    simulado = simulado_service.gerar_e_persistir(
        sessao, simulado_id=simulado_id, seed=req.seed
    )
    return _resumo(simulado)


@router.get(
    "/{simulado_id}/preview",
    summary="Prévia COM gabarito (gestor)",
    dependencies=[Depends(require_gestor)],
)
def preview(simulado_id: int, sessao: Session = Depends(get_session)) -> dict:
    questoes = simulado_service.montar_questoes(
        sessao, simulado_id=simulado_id, incluir_gabarito=True
    )
    return {"simulado_id": simulado_id, "questoes": questoes}


@router.post(
    "/{simulado_id}/liberar",
    summary="Liberar para os alunos (gestor)",
    dependencies=[Depends(require_gestor)],
)
def liberar(simulado_id: int, sessao: Session = Depends(get_session)) -> dict:
    simulado = simulado_service.liberar(sessao, simulado_id=simulado_id)
    return _resumo(simulado)


@router.get(
    "/{simulado_id}/questoes",
    summary="Questões do simulado SEM gabarito (visão do aluno)",
    dependencies=[Depends(obter_usuario_atual)],
)
def questoes_do_aluno(
    simulado_id: int, sessao: Session = Depends(get_session)
) -> dict:
    questoes = simulado_service.montar_questoes(
        sessao, simulado_id=simulado_id, incluir_gabarito=False
    )
    return {"simulado_id": simulado_id, "questoes": questoes}


@router.post(
    "/{simulado_id}/finalizar",
    summary="Finalizar e corrigir (gestor)",
    dependencies=[Depends(require_gestor)],
)
def finalizar(simulado_id: int, sessao: Session = Depends(get_session)) -> dict:
    return simulado_service.finalizar_e_corrigir(sessao, simulado_id=simulado_id)


@router.delete(
    "/{simulado_id}/questoes/{questao_id}",
    summary="Remover uma questão do simulado (gestor, antes de liberar)",
    dependencies=[Depends(require_gestor)],
)
def remover_questao(
    simulado_id: int, questao_id: int, sessao: Session = Depends(get_session)
) -> dict:
    simulado_service.remover_questao(
        sessao, simulado_id=simulado_id, questao_id=questao_id
    )
    questoes = simulado_service.montar_questoes(
        sessao, simulado_id=simulado_id, incluir_gabarito=True
    )
    return {"simulado_id": simulado_id, "questoes": questoes}


@router.post(
    "/{simulado_id}/questoes/{questao_id}/trocar",
    summary="Trocar uma questão por outra equivalente (gestor, antes de liberar)",
    dependencies=[Depends(require_gestor)],
)
def trocar_questao(
    simulado_id: int, questao_id: int, sessao: Session = Depends(get_session)
) -> dict:
    simulado_service.trocar_questao(
        sessao, simulado_id=simulado_id, questao_id=questao_id
    )
    questoes = simulado_service.montar_questoes(
        sessao, simulado_id=simulado_id, incluir_gabarito=True
    )
    return {"simulado_id": simulado_id, "questoes": questoes}
