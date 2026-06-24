from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Conteudo, Materia, Nivel, Serie


def listar_series(sessao: Session) -> list[Serie]:
    return list(sessao.scalars(select(Serie).order_by(Serie.id)))


def listar_materias(sessao: Session) -> list[Materia]:
    return list(sessao.scalars(select(Materia).order_by(Materia.nome)))


def listar_niveis(sessao: Session) -> list[Nivel]:
    return list(sessao.scalars(select(Nivel).order_by(Nivel.id)))


def listar_conteudos(sessao: Session, *, materia: str | None = None) -> list[Conteudo]:
    stmt = select(Conteudo).join(Materia).order_by(Conteudo.nome)
    if materia:
        stmt = stmt.where(Materia.nome == materia)
    return list(sessao.scalars(stmt))


def serie_por_nome(sessao: Session, nome: str) -> Serie | None:
    return sessao.scalar(select(Serie).where(Serie.nome == nome))


def materia_por_nome(sessao: Session, nome: str) -> Materia | None:
    return sessao.scalar(select(Materia).where(Materia.nome == nome))


def nivel_por_nome(sessao: Session, nome: str) -> Nivel | None:
    return sessao.scalar(select(Nivel).where(Nivel.nome == nome))


def conteudo_por_nome(sessao: Session, nome: str, materia_id: int) -> Conteudo | None:
    return sessao.scalar(
        select(Conteudo).where(
            Conteudo.nome == nome,
            Conteudo.materia_id == materia_id,
        )
    )
