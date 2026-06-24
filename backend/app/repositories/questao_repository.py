from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Conteudo, Materia, Nivel, Questao, Serie


def filtrar_questoes(
    sessao: Session,
    *,
    serie: Optional[str] = None,
    materia: Optional[str] = None,
    materias: Optional[Sequence[str]] = None,
    conteudos: Optional[Sequence[str]] = None,
    nivel: Optional[str] = None,
    adaptacoes: Optional[Sequence[str]] = None,
    limite: Optional[int] = None,
    offset: int = 0,
) -> list[Questao]:
    stmt = (
        select(Questao)
        .join(Serie, Questao.serie_id == Serie.id)
        .join(Materia, Questao.materia_id == Materia.id)
        .join(Conteudo, Questao.conteudo_id == Conteudo.id)
        .join(Nivel, Questao.nivel_id == Nivel.id)
        .options(selectinload(Questao.alternativas))
        .order_by(Questao.id)
    )

    if serie:
        stmt = stmt.where(Serie.nome == serie)
    if materias:
        stmt = stmt.where(Materia.nome.in_(list(materias)))
    elif materia:
        stmt = stmt.where(Materia.nome == materia)
    if conteudos:
        stmt = stmt.where(Conteudo.nome.in_(list(conteudos)))
    if nivel:
        stmt = stmt.where(Nivel.nome == nivel)

    questoes = list(sessao.scalars(stmt).unique().all())

    if adaptacoes:
        alvo = set(adaptacoes)
        questoes = [q for q in questoes if alvo.issubset(set(q.adaptacoes or []))]

    if offset:
        questoes = questoes[offset:]
    if limite is not None:
        questoes = questoes[:limite]

    return questoes


def buscar_paginado(
    sessao: Session,
    *,
    serie: Optional[str] = None,
    materia: Optional[str] = None,
    conteudo: Optional[str] = None,
    nivel: Optional[str] = None,
    adaptacoes: Optional[Sequence[str]] = None,
    pagina: int = 1,
    por_pagina: int = 20,
) -> tuple[list[Questao], int]:
    todas = filtrar_questoes(
        sessao,
        serie=serie,
        materia=materia,
        conteudos=[conteudo] if conteudo else None,
        nivel=nivel,
        adaptacoes=adaptacoes,
    )
    total = len(todas)
    inicio = (pagina - 1) * por_pagina
    return todas[inicio : inicio + por_pagina], total


def contar_questoes(
    sessao: Session,
    *,
    serie: Optional[str] = None,
    materia: Optional[str] = None,
) -> int:
    stmt = select(func.count(Questao.id))
    if serie:
        stmt = stmt.join(Serie, Questao.serie_id == Serie.id).where(Serie.nome == serie)
    if materia:
        stmt = stmt.join(Materia, Questao.materia_id == Materia.id).where(
            Materia.nome == materia
        )
    return sessao.scalar(stmt) or 0


def disponibilidade_por_nivel(
    sessao: Session,
    *,
    serie: Optional[str] = None,
    materia: Optional[str] = None,
) -> dict[str, int]:
    stmt = (
        select(Nivel.nome, func.count(Questao.id))
        .join(Questao, Questao.nivel_id == Nivel.id)
        .group_by(Nivel.nome)
    )
    if serie:
        stmt = stmt.join(Serie, Questao.serie_id == Serie.id).where(Serie.nome == serie)
    if materia:
        stmt = stmt.join(Materia, Questao.materia_id == Materia.id).where(
            Materia.nome == materia
        )
    return {nome: total for nome, total in sessao.execute(stmt).all()}
