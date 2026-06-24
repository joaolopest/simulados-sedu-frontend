from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Aluno, Usuario


def buscar_por_email(sessao: Session, email: str) -> Usuario | None:
    return sessao.scalar(select(Usuario).where(Usuario.email == email))


def buscar_por_id(sessao: Session, usuario_id: int) -> Usuario | None:
    return sessao.get(Usuario, usuario_id)


def aluno_do_usuario(sessao: Session, usuario_id: int) -> Aluno | None:
    return sessao.scalar(select(Aluno).where(Aluno.usuario_id == usuario_id))
