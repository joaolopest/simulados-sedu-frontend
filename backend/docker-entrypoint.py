"""Entrypoint do container do backend.

Ordem:
1. Espera o Postgres configurado em DATABASE_URL responder.
2. Cria/atualiza o schema de forma idempotente.
3. Executa o seed complementar nao destrutivo.
4. Sobe a API.
"""

import os
import subprocess
import sys
import time

from sqlalchemy import create_engine, text


def normaliza(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


def main() -> None:
    url = normaliza(os.environ["DATABASE_URL"])

    print(">> Aguardando o Postgres configurado...")
    for _tentativa in range(40):
        try:
            with create_engine(url).connect() as con:
                con.execute(text("SELECT 1"))
            print(">> Banco pronto.")
            break
        except Exception:
            time.sleep(2)
    else:
        sys.exit("Banco nao respondeu a tempo.")

    print(">> Aplicando schema idempotente...")
    subprocess.run([sys.executable, "scripts/init_db.py"], check=True)

    print(">> Aplicando seed complementar...")
    subprocess.run([sys.executable, "scripts/seed_demo.py"], check=True)

    print(">> Subindo a API em 0.0.0.0:8000")
    os.execvp(
        "uvicorn",
        ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000"],
    )


if __name__ == "__main__":
    main()
