import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base, engine  # noqa: E402
from app import models  # noqa: E402, F401


def main() -> None:
    print(f"Criando tabelas em: {engine.url}")
    Base.metadata.create_all(engine)
    print("\nTabelas registradas:")
    for nome_tabela in Base.metadata.tables:
        print(f"  - {nome_tabela}")
    print("\nOK!")


if __name__ == "__main__":
    main()
