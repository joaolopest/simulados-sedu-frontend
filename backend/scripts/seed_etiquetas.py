import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Nivel, Serie  # noqa: E402

SERIES_PADRAO = [
    "6º ano",
    "7º ano",
    "8º ano",
    "9º ano",
    "1ª série EM",
    "2ª série EM",
    "3ª série EM",
]

NIVEIS_PADRAO = ["Fácil", "Médio", "Difícil"]


def _inserir_se_faltar(sessao, modelo, nomes: list[str]) -> tuple[int, int]:
    existentes = set(sessao.scalars(select(modelo.nome)).all())
    novos = [nome for nome in nomes if nome not in existentes]
    for nome in novos:
        sessao.add(modelo(nome=nome))
    return len(novos), len(existentes)


def main() -> None:
    with SessionLocal() as sessao:
        novas_series, series_existentes = _inserir_se_faltar(sessao, Serie, SERIES_PADRAO)
        novos_niveis, niveis_existentes = _inserir_se_faltar(sessao, Nivel, NIVEIS_PADRAO)
        sessao.commit()

        print("=== Seed de etiquetas ===")
        print(f"Series: {novas_series} novas, {series_existentes} ja existiam")
        print(f"Niveis: {novos_niveis} novos, {niveis_existentes} ja existiam")

        print("\nSeries no banco:")
        for s in sessao.scalars(select(Serie).order_by(Serie.id)):
            print(f"  {s.id}. {s.nome}")

        print("\nNiveis no banco:")
        for n in sessao.scalars(select(Nivel).order_by(Nivel.id)):
            print(f"  {n.id}. {n.nome}")


if __name__ == "__main__":
    main()
