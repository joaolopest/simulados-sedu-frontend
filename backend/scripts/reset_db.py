"""Reset destrutivo do banco local: dropa tudo, recria schema e roda seed demo.

Use apenas em ambiente local/backup descartavel.
"""

import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent))
sys.path.insert(0, str(AQUI))

import app.models  # noqa: F401,E402
from app.database import Base, engine  # noqa: E402
from app.schema_migrations import aplicar_migracoes_idempotentes  # noqa: E402
from seed_demo import main as seed_main  # noqa: E402


def main() -> None:
    print(">> Dropando todas as tabelas...")
    Base.metadata.drop_all(engine)
    print(">> Recriando schema a partir dos models...")
    Base.metadata.create_all(engine)
    aplicar_migracoes_idempotentes(engine)
    print(">> Populando dados complementares persistentes...")
    seed_main()
    print(">> Reset concluido.")


if __name__ == "__main__":
    main()
