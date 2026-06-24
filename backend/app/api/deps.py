from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.database import SessionLocal


def get_session() -> Iterator[Session]:
    sessao = SessionLocal()
    try:
        yield sessao
    finally:
        sessao.close()
