"""Configuracao do banco de dados.

Ordem de conexao:
1. `DATABASE_URL` no ambiente, normalmente injetado pelo Supabase ou scripts.
2. `.env` da raiz do projeto.
3. `backend/.env`.
4. Postgres local do Docker, acessivel pelo host em localhost:5432.

SQLite foi removido como fallback porque o app precisa persistir tudo no banco
relacional que tambem serve como backup local.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

try:
    from dotenv import load_dotenv

    BACKEND_DIR = Path(__file__).resolve().parent.parent
    ROOT_DIR = BACKEND_DIR.parent
    load_dotenv(ROOT_DIR / ".env", override=False)
    load_dotenv(BACKEND_DIR / ".env", override=False)
except ImportError:
    pass

DATABASE_URL_LOCAL = "postgresql+psycopg://postgres:postgres@localhost:5432/seduc"


def _normalizar_url(url: str) -> str:
    """Garante o driver psycopg3 para conexoes PostgreSQL."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


DATABASE_URL = _normalizar_url(os.environ.get("DATABASE_URL", DATABASE_URL_LOCAL))

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
