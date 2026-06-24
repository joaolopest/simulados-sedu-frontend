"""Testa a conexão com o banco e mostra quais tabelas existem.

Uso:
    python scripts/verificar_banco.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text  # noqa: E402

from app.database import DATABASE_URL, Base, engine  # noqa: E402
from app import models  # noqa: E402, F401  registra as tabelas no metadata


def url_segura(url: str) -> str:
    """Mascara a senha ao imprimir."""
    if "://" in url and "@" in url:
        proto, resto = url.split("://", 1)
        if "@" in resto and ":" in resto.split("@", 1)[0]:
            creds, host = resto.split("@", 1)
            usuario = creds.split(":", 1)[0]
            return f"{proto}://{usuario}:****@{host}"
    return url


def main() -> None:
    print(f"Conectando em: {url_segura(DATABASE_URL)}")
    try:
        with engine.connect() as con:
            con.execute(text("SELECT 1"))
        print(f"OK — conexao funcionou ({engine.dialect.name}).\n")
    except Exception as exc:
        print("\nFALHA NA CONEXAO:")
        print(f"  {exc}\n")
        print("Verifique:")
        print("  - A DATABASE_URL no .env esta correta (senha, host, porta)")
        print("  - Voce trocou [YOUR-PASSWORD] pela senha real")
        print("  - Esta usando a 'Session pooler' do Supabase (porta 5432)")
        sys.exit(1)

    esperadas = sorted(Base.metadata.tables.keys())
    existentes = set(inspect(engine).get_table_names())
    faltando = [t for t in esperadas if t not in existentes]

    print(f"Tabelas esperadas pelo projeto: {len(esperadas)}")
    print(f"Tabelas que ja existem no banco: {len(existentes & set(esperadas))}")
    print(f"Faltando: {len(faltando)}")

    if faltando:
        print("\nFaltam estas tabelas:")
        for t in faltando:
            print(f"  x {t}")
        print("\nProximo passo: python scripts/init_db.py")
    else:
        print("\nTodas as tabelas existem. Pode popular com os seeds.")


if __name__ == "__main__":
    main()
