from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Turma


def listar(sessao: Session) -> list[Turma]:
    return list(sessao.scalars(select(Turma).order_by(Turma.id)))


def buscar_por_id(sessao: Session, turma_id: int) -> Turma | None:
    return sessao.get(Turma, turma_id)
