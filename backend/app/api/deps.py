"""Dependências compartilhadas da API (injeção do FastAPI)."""

from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.database import SessionLocal


def get_session() -> Iterator[Session]:
    """Abre uma sessão por requisição e fecha ao final (padrão FastAPI)."""
    sessao = SessionLocal()
    try:
        yield sessao
    finally:
        sessao.close()
