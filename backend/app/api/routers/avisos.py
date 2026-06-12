"""Endpoints de AVISOS.

    GET  /avisos             admin lista (filtros: turma, escola, prioridade)
    POST /avisos             admin/gestor publica
    GET  /avisos/aluno/{id}  aluno (vínculo escolar) consulta seus avisos
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.api.permissoes import admin_gestor_suporte, exigir_dono_aluno
from app.enums import AlvoAvisoTipo, PrioridadeAviso, VinculoAluno
from app.models import Aluno, Aviso, Usuario
from app.services.vinculo_service import exigir_vinculo

router = APIRouter(prefix="/avisos", tags=["avisos"])


class AvisoCriarRequest(BaseModel):
    titulo: str
    conteudo: str
    prioridade: PrioridadeAviso = PrioridadeAviso.INFORMATIVA
    alvo_tipo: AlvoAvisoTipo
    turma_id: int | None = None
    escola_id: int | None = None
    criado_por: int
    expira_em: datetime | None = None
    fixado: bool = False


def _serializar(a: Aviso) -> dict:
    return {
        "id": a.id,
        "titulo": a.titulo,
        "conteudo": a.conteudo,
        "prioridade": a.prioridade.value,
        "alvo": {
            "tipo": a.alvo_tipo.value,
            "turma_id": a.turma_id,
            "escola_id": a.escola_id,
        },
        "criado_por": a.criado_por,
        "publicado_em": a.publicado_em.isoformat(),
        "expira_em": a.expira_em.isoformat() if a.expira_em else None,
        "fixado": a.fixado,
    }


@router.get("", dependencies=[Depends(admin_gestor_suporte)])
def listar(
    turma_id: int | None = Query(None),
    escola_id: int | None = Query(None),
    prioridade: PrioridadeAviso | None = Query(None),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(Aviso)
    if turma_id:
        q = q.filter(Aviso.alvo_tipo == AlvoAvisoTipo.TURMA, Aviso.turma_id == turma_id)
    if escola_id:
        q = q.filter(
            Aviso.alvo_tipo == AlvoAvisoTipo.ESCOLA, Aviso.escola_id == escola_id,
        )
    if prioridade:
        q = q.filter(Aviso.prioridade == prioridade)
    avisos = q.all()
    avisos.sort(key=lambda a: (not a.fixado, a.publicado_em), reverse=False)
    avisos.sort(key=lambda a: a.fixado, reverse=True)
    return {"total": len(avisos), "dados": [_serializar(a) for a in avisos]}


@router.post("", status_code=201, dependencies=[Depends(admin_gestor_suporte)])
def criar(req: AvisoCriarRequest, sessao: Session = Depends(get_session)) -> dict:
    if req.alvo_tipo is AlvoAvisoTipo.TURMA and not req.turma_id:
        raise HTTPException(status_code=422, detail="turma_id é obrigatório para alvo 'turma'.")
    if req.alvo_tipo is AlvoAvisoTipo.ESCOLA and not req.escola_id:
        raise HTTPException(status_code=422, detail="escola_id é obrigatório para alvo 'escola'.")
    if not sessao.get(Usuario, req.criado_por):
        raise HTTPException(status_code=400, detail="criado_por não existe.")

    novo = Aviso(
        titulo=req.titulo,
        conteudo=req.conteudo,
        prioridade=req.prioridade,
        alvo_tipo=req.alvo_tipo,
        turma_id=req.turma_id,
        escola_id=req.escola_id,
        criado_por=req.criado_por,
        expira_em=req.expira_em,
        fixado=req.fixado,
    )
    sessao.add(novo)
    sessao.commit()
    sessao.refresh(novo)
    return _serializar(novo)


# --- aluno (🔴 escola apenas) ---


@router.get("/aluno/{aluno_id}", dependencies=[Depends(exigir_dono_aluno)])
def listar_para_aluno(aluno_id: int, sessao: Session = Depends(get_session)) -> dict:
    aluno = sessao.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    exigir_vinculo(aluno, VinculoAluno.ESCOLA)

    agora = datetime.utcnow()
    q = sessao.query(Aviso)
    avisos = [
        a
        for a in q.all()
        if (a.expira_em is None or a.expira_em > agora)
        and (
            a.alvo_tipo is AlvoAvisoTipo.REDE
            or (a.alvo_tipo is AlvoAvisoTipo.ESCOLA and aluno.turma and a.escola_id == aluno.turma.escola_id)
            or (a.alvo_tipo is AlvoAvisoTipo.TURMA and a.turma_id == aluno.turma_id)
        )
    ]
    avisos.sort(key=lambda a: a.publicado_em, reverse=True)
    avisos.sort(key=lambda a: a.fixado, reverse=True)
    return {
        "vinculo": "escola",
        "total": len(avisos),
        "dados": [_serializar(a) for a in avisos],
    }
