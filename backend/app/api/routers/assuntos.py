"""Endpoints de ASSUNTOS DE ESTUDO.

    GET  /assuntos                          admin: lista (filtros)
    POST /assuntos                          admin: cadastra
    GET  /assuntos/turmas/{turma_id}        admin: vê quais assuntos a turma estuda
    POST /assuntos/turmas/{turma_id}        admin: seleciona assuntos da turma
    GET  /assuntos/aluno/{aluno_id}         aluno (🔴 escola): ver assuntos da sua turma
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import PrioridadeAssunto, VinculoAluno
from app.models import (
    Aluno,
    AssuntoEstudo,
    AssuntoPorTurma,
    Materia,
    RecursoEstudo,
    Serie,
    Turma,
    Usuario,
)
from app.services.vinculo_service import exigir_vinculo

router = APIRouter(prefix="/assuntos", tags=["assuntos"])


class RecursoIn(BaseModel):
    tipo: str
    titulo: str
    url: str | None = None
    descricao: str | None = None
    duracao_min: int | None = None


class AssuntoCriarRequest(BaseModel):
    titulo: str
    materia_id: int
    serie_id: int | None = None
    edital_id: int | None = None
    publico_alvo: VinculoAluno
    prioridade: PrioridadeAssunto = PrioridadeAssunto.MEDIA
    topicos: list[str] = []
    competencias: list[str] = []
    recursos: list[RecursoIn] = []


class SelecionarAssuntosTurmaRequest(BaseModel):
    assunto_ids: list[int]
    selecionado_por: int


def _serializar(a: AssuntoEstudo) -> dict:
    return {
        "id": a.id,
        "titulo": a.titulo,
        "materia": a.materia.nome if a.materia else None,
        "serie": a.serie.nome if a.serie else None,
        "edital_id": a.edital_id,
        "publico_alvo": a.publico_alvo.value,
        "prioridade": a.prioridade.value,
        "topicos": a.topicos,
        "competencias": a.competencias,
        "recursos": [
            {
                "id": r.id,
                "tipo": r.tipo.value,
                "titulo": r.titulo,
                "url": r.url,
                "descricao": r.descricao,
                "duracao_min": r.duracao_min,
            }
            for r in a.recursos
        ],
    }


@router.get("")
def listar(
    materia_id: int | None = Query(None),
    serie_id: int | None = Query(None),
    publico_alvo: VinculoAluno | None = Query(None),
    prioridade: PrioridadeAssunto | None = Query(None),
    edital_id: int | None = Query(None),
    busca: str | None = Query(None),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(AssuntoEstudo)
    if materia_id:
        q = q.filter(AssuntoEstudo.materia_id == materia_id)
    if serie_id:
        q = q.filter(AssuntoEstudo.serie_id == serie_id)
    if publico_alvo:
        q = q.filter(AssuntoEstudo.publico_alvo == publico_alvo)
    if prioridade:
        q = q.filter(AssuntoEstudo.prioridade == prioridade)
    if edital_id:
        q = q.filter(AssuntoEstudo.edital_id == edital_id)
    if busca:
        q = q.filter(AssuntoEstudo.titulo.ilike(f"%{busca}%"))
    assuntos = q.all()
    return {"total": len(assuntos), "dados": [_serializar(a) for a in assuntos]}


@router.post("", status_code=201)
def criar(req: AssuntoCriarRequest, sessao: Session = Depends(get_session)) -> dict:
    if not sessao.get(Materia, req.materia_id):
        raise HTTPException(status_code=400, detail="materia_id inexistente.")
    if req.serie_id and not sessao.get(Serie, req.serie_id):
        raise HTTPException(status_code=400, detail="serie_id inexistente.")
    assunto = AssuntoEstudo(
        titulo=req.titulo,
        materia_id=req.materia_id,
        serie_id=req.serie_id,
        edital_id=req.edital_id,
        publico_alvo=req.publico_alvo,
        prioridade=req.prioridade,
        topicos=req.topicos,
        competencias=req.competencias,
    )
    sessao.add(assunto)
    sessao.flush()
    for r in req.recursos:
        sessao.add(
            RecursoEstudo(
                assunto_id=assunto.id,
                tipo=r.tipo,
                titulo=r.titulo,
                url=r.url,
                descricao=r.descricao,
                duracao_min=r.duracao_min,
            ),
        )
    sessao.commit()
    sessao.refresh(assunto)
    return _serializar(assunto)


# --- por turma ---


@router.get("/turmas/{turma_id}")
def assuntos_da_turma(turma_id: int, sessao: Session = Depends(get_session)) -> dict:
    turma = sessao.get(Turma, turma_id)
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    relacoes = sessao.query(AssuntoPorTurma).filter(AssuntoPorTurma.turma_id == turma_id).all()
    assuntos = [r.assunto for r in relacoes]
    return {
        "turma_id": turma_id,
        "total": len(assuntos),
        "assuntos": [_serializar(a) for a in assuntos],
    }


@router.post("/turmas/{turma_id}")
def selecionar_assuntos_turma(
    turma_id: int,
    req: SelecionarAssuntosTurmaRequest,
    sessao: Session = Depends(get_session),
) -> dict:
    turma = sessao.get(Turma, turma_id)
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    if not sessao.get(Usuario, req.selecionado_por):
        raise HTTPException(status_code=400, detail="selecionado_por inexistente.")
    desconhecidos = [
        aid
        for aid in req.assunto_ids
        if not sessao.get(AssuntoEstudo, aid)
    ]
    if desconhecidos:
        raise HTTPException(
            status_code=422,
            detail={"codigo": "ASSUNTOS_DESCONHECIDOS", "ids": desconhecidos},
        )

    # apaga vínculos atuais e re-cria — semântica de "set"
    sessao.query(AssuntoPorTurma).filter(AssuntoPorTurma.turma_id == turma_id).delete()
    for aid in req.assunto_ids:
        sessao.add(
            AssuntoPorTurma(
                turma_id=turma_id,
                assunto_id=aid,
                selecionado_por=req.selecionado_por,
            ),
        )
    sessao.commit()
    return assuntos_da_turma(turma_id, sessao)


# --- aluno (🔴 escola) ---


@router.get("/aluno/{aluno_id}")
def assuntos_para_aluno(aluno_id: int, sessao: Session = Depends(get_session)) -> dict:
    aluno = sessao.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    exigir_vinculo(aluno, VinculoAluno.ESCOLA)
    if not aluno.turma_id:
        return {"vinculo": "escola", "total": 0, "assuntos": []}
    relacoes = (
        sessao.query(AssuntoPorTurma)
        .filter(AssuntoPorTurma.turma_id == aluno.turma_id)
        .all()
    )
    assuntos = [r.assunto for r in relacoes]
    assuntos.sort(key=lambda a: a.prioridade.value)
    return {
        "vinculo": "escola",
        "turma_id": aluno.turma_id,
        "total": len(assuntos),
        "assuntos": [_serializar(a) for a in assuntos],
    }
