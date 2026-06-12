"""Configuração do banco de dados.

A URL de conexão vem da variável de ambiente `DATABASE_URL` (carregada de um
arquivo `.env` se existir). Sem ela, usa um SQLite local — o comportamento
original do projeto.

Para Supabase / PostgreSQL, basta colar a connection string no `.env`:

    DATABASE_URL=postgresql://postgres.xxxx:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

O código abaixo reescreve `postgres://` e `postgresql://` para usar o driver
`psycopg` (psycopg3), que é o instalado no projeto.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Carrega .env automaticamente se python-dotenv estiver instalado.
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH_DEFAULT = BASE_DIR / "seduc_questoes.db"


def _normalizar_url(url: str) -> str:
    """Garante o driver psycopg3 para conexões PostgreSQL.

    Supabase/Heroku entregam a string como `postgres://` ou `postgresql://`,
    que o SQLAlchemy tenta abrir com psycopg2. Reescrevemos para `psycopg`.
    """
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _normalizar_url(
    os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH_DEFAULT}")
)

# SQLite precisa de check_same_thread=False com FastAPI (múltiplas threads).
conexao_args = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=conexao_args,
    pool_pre_ping=True,  # reconecta se a conexão cair (importante em cloud)
)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
