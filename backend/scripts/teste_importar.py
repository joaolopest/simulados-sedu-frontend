"""Testa a importação de questões a partir de um arquivo JSON.

Usa o exemplo scripts/exemplo_importacao.json, que de propósito tem:
    1 questão válida, 1 com conteúdo inexistente e 1 sem alternativa correta
para demonstrar o relatório de erros por linha.

Pré-requisitos: init_db + seed_etiquetas + seed_questoes_demo (para existir
a matéria 'Matemática' e o conteúdo 'Funções').
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.services import importacao_service  # noqa: E402

ARQUIVO = Path(__file__).resolve().parent / "exemplo_importacao.json"


def main() -> None:
    payload = json.loads(ARQUIVO.read_text(encoding="utf-8"))

    with SessionLocal() as sessao:
        relatorio = importacao_service.importar_questoes(sessao, payload)

    print("=== Relatorio de importacao ===")
    print(f"  Importadas: {relatorio.importadas}")
    print(f"  Rejeitadas: {relatorio.rejeitadas}")
    if relatorio.erros:
        print("  Erros:")
        for e in relatorio.erros:
            print(f"    - linha {e.linha}: {e.motivo}")


if __name__ == "__main__":
    main()
