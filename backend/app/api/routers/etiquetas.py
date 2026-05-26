from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models import Conteudo, Materia, Nivel, Serie

router = APIRouter(prefix="/etiquetas", tags=["etiquetas"])


@router.get("/series")
def listar_series(sessao: Session = Depends(get_session)) -> list[dict]:
    return [
        {"id": s.id, "nome": s.nome}
        for s in sessao.scalars(select(Serie).order_by(Serie.id))
    ]


@router.get("/materias")
def listar_materias(sessao: Session = Depends(get_session)) -> list[dict]:
    return [
        {"id": m.id, "nome": m.nome}
        for m in sessao.scalars(select(Materia).order_by(Materia.nome))
    ]


@router.get("/niveis")
def listar_niveis(sessao: Session = Depends(get_session)) -> list[dict]:
    return [
        {"id": n.id, "nome": n.nome}
        for n in sessao.scalars(select(Nivel).order_by(Nivel.id))
    ]


@router.get("/conteudos")
def listar_conteudos(
    materia: str | None = None,
    sessao: Session = Depends(get_session),
) -> list[dict]:
    stmt = select(Conteudo).join(Materia).order_by(Conteudo.nome)
    if materia:
        stmt = stmt.where(Materia.nome == materia)
    return [
        {"id": c.id, "nome": c.nome, "materia": c.materia.nome}
        for c in sessao.scalars(stmt)
    ]
