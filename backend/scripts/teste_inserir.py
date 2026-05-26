"""Teste manual de inserção e embaralhamento — modelo alinhado ao Backlog v4.

Cria (ou reutiliza) Materia e Conteudo; busca Serie e Nivel já populados
pelo seed_etiquetas.py; insere uma Questao com 4 alternativas e demonstra
o embaralhamento sem perder o vínculo com a questão.

Pré-requisitos:
    1) python scripts/init_db.py
    2) python scripts/seed_etiquetas.py
"""

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Alternativa,
    Conteudo,
    Materia,
    Nivel,
    Questao,
    Serie,
)


def _obter_ou_criar_materia(sessao, nome: str) -> Materia:
    materia = sessao.scalar(select(Materia).where(Materia.nome == nome))
    if materia is None:
        materia = Materia(nome=nome)
        sessao.add(materia)
        sessao.flush()
    return materia


def _obter_ou_criar_conteudo(sessao, nome: str, materia: Materia) -> Conteudo:
    conteudo = sessao.scalar(
        select(Conteudo).where(
            Conteudo.nome == nome,
            Conteudo.materia_id == materia.id,
        )
    )
    if conteudo is None:
        conteudo = Conteudo(nome=nome, materia=materia)
        sessao.add(conteudo)
        sessao.flush()
    return conteudo


def main() -> None:
    with SessionLocal() as sessao:
        # 1) Etiquetas (Serie/Nivel já devem existir via seed; falha clara se faltarem)
        serie = sessao.scalar(select(Serie).where(Serie.nome == "8º ano"))
        nivel = sessao.scalar(select(Nivel).where(Nivel.nome == "Fácil"))
        if serie is None or nivel is None:
            raise RuntimeError(
                "Etiquetas faltando. Rode antes: python scripts/seed_etiquetas.py"
            )

        # 2) Matéria e Conteúdo (idempotente)
        materia = _obter_ou_criar_materia(sessao, "Matemática")
        conteudo = _obter_ou_criar_conteudo(sessao, "Equação do 1º grau", materia)

        # 3) Questão + alternativas (bloco inseparável criado de uma vez)
        questao = Questao(
            enunciado="Qual é a raiz da equação 2x - 8 = 0?",
            imagem_url=None,
            serie=serie,
            materia=materia,
            conteudo=conteudo,
            nivel=nivel,
            adaptacoes=["tdah"],
            alternativas=[
                Alternativa(texto="x = 2", correta=False, ordem_original=1),
                Alternativa(texto="x = 4", correta=True, ordem_original=2),
                Alternativa(texto="x = 6", correta=False, ordem_original=3),
                Alternativa(texto="x = 8", correta=False, ordem_original=4),
            ],
        )
        sessao.add(questao)
        sessao.commit()
        sessao.refresh(questao)

        print("=== Questao cadastrada ===")
        print(f"  ID:         {questao.id}")
        print(f"  Materia:    {questao.materia.nome}")
        print(f"  Conteudo:   {questao.conteudo.nome}")
        print(f"  Serie:      {questao.serie.nome}")
        print(f"  Nivel:      {questao.nivel.nome}")
        print(f"  Adaptacoes: {questao.adaptacoes}")
        print(f"  Enunciado:  {questao.enunciado}")

        # 4) Embaralhamento em memória — não altera o banco
        alternativas_embaralhadas = list(questao.alternativas)
        random.shuffle(alternativas_embaralhadas)

        print("\n=== Apresentacao na prova (embaralhada) ===")
        for letra, alt in zip("ABCDE", alternativas_embaralhadas):
            marca = "  <- correta" if alt.correta else ""
            print(f"  {letra}) {alt.texto}{marca}")

        print("\n=== Ordem original (preservada no banco) ===")
        for alt in questao.alternativas:
            print(f"  {alt.ordem_original}. {alt.texto}")


if __name__ == "__main__":
    main()
