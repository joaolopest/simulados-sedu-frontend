"""Entrypoint do container do backend.

Ordem:
  1. Espera o Postgres ficar pronto (retry).
  2. Cria as tabelas (init_db — idempotente).
  3. Popula os dados dos mocks SE o banco estiver vazio (seed_from_mocks).
  4. Sobe a API (uvicorn).

Assim, `docker compose up` entrega o backend + banco + dados funcionando,
sem precisar de .env nem senha — o mesmo conteúdo que está no Supabase.
"""

import os
import subprocess
import sys
import time

from sqlalchemy import create_engine, func, select, text


def normaliza(url: str) -> str:
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


def main() -> None:
    url = normaliza(os.environ["DATABASE_URL"])

    # 1. espera o banco
    print(">> Aguardando o Postgres...")
    for tentativa in range(40):
        try:
            with create_engine(url).connect() as con:
                con.execute(text("SELECT 1"))
            print(">> Postgres pronto.")
            break
        except Exception:
            time.sleep(2)
    else:
        sys.exit("Postgres não respondeu a tempo.")

    # 2. cria as tabelas
    print(">> Criando tabelas (init_db)...")
    subprocess.run([sys.executable, "scripts/init_db.py"], check=True)

    # 3. popula se estiver vazio
    from app.database import SessionLocal
    from app.models import Usuario

    with SessionLocal() as s:
        total = s.scalar(select(func.count()).select_from(Usuario)) or 0

    if total > 0:
        print(f">> Banco já tem {total} usuários — pulando seed.")
    else:
        print(">> Banco vazio — populando com os dados dos mocks...")
        subprocess.run([sys.executable, "scripts/seed_from_mocks.py"], check=True)

    # 4. sobe a API
    print(">> Subindo a API em 0.0.0.0:8000")
    os.execvp(
        "uvicorn",
        ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000"],
    )


if __name__ == "__main__":
    main()
