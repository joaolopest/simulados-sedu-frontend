import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.repositories import questao_repository  # noqa: E402
from app.services import prova_service  # noqa: E402

SERIE = "9º ano"
MATERIA = "Matemática"


def main() -> None:
    with SessionLocal() as sessao:
        print("=== Disponibilidade no banco (repositorio) ===")
        disp = questao_repository.disponibilidade_por_nivel(
            sessao, serie=SERIE, materia=MATERIA
        )
        for nivel, total in disp.items():
            print(f"  {nivel}: {total} questoes")

        print("\n=== Gerando prova (servico) ===")
        print("  Parametros: 9o ano, Matematica, 10 questoes, 30% facil / 50% medio / 20% dificil")
        prova = prova_service.gerar_prova(
            sessao,
            serie=SERIE,
            materia=MATERIA,
            distribuicao={"Fácil": 0.3, "Médio": 0.5, "Difícil": 0.2},
            quantidade=10,
            seed=42,
        )

        print(f"\n  Total gerado: {prova.total}")
        print(f"  Distribuicao real por nivel: {prova.distribuicao_real}")

        print("\n=== PROVA GERADA ===")
        for q in prova.questoes:
            print(f"\nQuestao {q.ordem}  [{q.conteudo} | {q.nivel}]")
            print(f"  {q.enunciado}")
            for alt in q.alternativas:
                print(f"    {alt.letra}) {alt.texto}")

        print("\n=== GABARITO ===")
        print("  " + "   ".join(f"{ordem}:{letra}" for ordem, letra in prova.gabarito_dict().items()))


if __name__ == "__main__":
    main()
