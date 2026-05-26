"""Camada de REPOSITÓRIO de questões.

Responsabilidade única: falar com o banco (consultas SQL via SQLAlchemy).
Não tem regra de negócio — quem decide "como montar a prova" é o serviço
(app/services/prova_service.py). Quem expõe na web é a API (app/api/).

Fluxo das camadas:
    API (HTTP)  ->  Service (regra)  ->  Repository (banco)  ->  PostgreSQL/SQLite
"""

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
    conteudos: Optional[Sequence[str]] = None,
    nivel: Optional[str] = None,
    adaptacoes: Optional[Sequence[str]] = None,
    limite: Optional[int] = None,
) -> list[Questao]:
    """Retorna questões que batem com os filtros (todos opcionais).

    As alternativas já vêm carregadas (selectinload) para evitar consultas extras.
    O filtro de `adaptacoes` é feito em Python porque o campo é JSON.
    """
    stmt = (
        select(Questao)
        .join(Serie, Questao.serie_id == Serie.id)
        .join(Materia, Questao.materia_id == Materia.id)
        .join(Conteudo, Questao.conteudo_id == Conteudo.id)
        .join(Nivel, Questao.nivel_id == Nivel.id)
        .options(selectinload(Questao.alternativas))
    )

    if serie:
        stmt = stmt.where(Serie.nome == serie)
    if materia:
        stmt = stmt.where(Materia.nome == materia)
    if conteudos:
        stmt = stmt.where(Conteudo.nome.in_(list(conteudos)))
    if nivel:
        stmt = stmt.where(Nivel.nome == nivel)

    questoes = list(sessao.scalars(stmt).unique().all())

    # Filtro de adaptações cognitivas (campo JSON): a questão precisa conter
    # TODAS as adaptações pedidas. Ex.: pedir ["tdah"] traz questões com tdah.
    if adaptacoes:
        alvo = set(adaptacoes)
        questoes = [q for q in questoes if alvo.issubset(set(q.adaptacoes or []))]

    if limite is not None:
        questoes = questoes[:limite]

    return questoes


def contar_questoes(
    sessao: Session,
    *,
    serie: Optional[str] = None,
    materia: Optional[str] = None,
) -> int:
    """Conta quantas questões existem para um recorte (série/matéria)."""
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
    """Quantas questões existem por nível (Fácil/Médio/Difícil) no recorte.

    Útil para a tela do gestor saber se há questões suficientes antes de gerar.
    """
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
