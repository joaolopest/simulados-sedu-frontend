import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Alternativa, Conteudo, Materia, Nivel, Questao, Serie  # noqa: E402

SERIE = "9º ano"
MATERIA = "Matemática"

QUESTOES = [
    ("Equação do 2º grau", "Fácil",
     "Qual é a forma geral de uma equação do 2º grau?",
     [("ax² + bx + c = 0, com a ≠ 0", True), ("ax + b = 0", False),
      ("ax³ + b = 0", False), ("a/x = b", False)]),
    ("Equação do 2º grau", "Fácil",
     "Quantas raízes reais pode ter, no máximo, uma equação do 2º grau?",
     [("2", True), ("1", False), ("3", False), ("infinitas", False)]),
    ("Equação do 2º grau", "Médio",
     "As raízes de x² - 5x + 6 = 0 são:",
     [("2 e 3", True), ("1 e 6", False), ("-2 e -3", False), ("0 e 5", False)]),
    ("Equação do 2º grau", "Médio",
     "O discriminante (Δ) de x² + 4x + 4 = 0 vale:",
     [("0", True), ("16", False), ("-16", False), ("8", False)]),
    ("Equação do 2º grau", "Difícil",
     "Se uma equação do 2º grau tem Δ < 0, então ela:",
     [("não tem raízes reais", True), ("tem duas raízes reais distintas", False),
      ("tem uma raiz real dupla", False), ("tem três raízes", False)]),
    ("Funções", "Fácil",
     "Na função f(x) = 2x + 1, qual é o valor de f(0)?",
     [("1", True), ("2", False), ("0", False), ("3", False)]),
    ("Funções", "Fácil",
     "O gráfico de uma função do 1º grau é:",
     [("uma reta", True), ("uma parábola", False),
      ("uma circunferência", False), ("uma hipérbole", False)]),
    ("Funções", "Médio",
     "Na função f(x) = 3x - 6, qual valor de x faz f(x) = 0?",
     [("2", True), ("-2", False), ("6", False), ("3", False)]),
    ("Funções", "Médio",
     "O gráfico de f(x) = x² é uma:",
     [("parábola", True), ("reta", False), ("elipse", False), ("reta vertical", False)]),
    ("Funções", "Difícil",
     "Uma função do 2º grau f(x)=ax²+bx+c tem concavidade para baixo quando:",
     [("a < 0", True), ("a > 0", False), ("b < 0", False), ("c = 0", False)]),
    ("Teorema de Pitágoras", "Fácil",
     "O Teorema de Pitágoras relaciona os lados de qual triângulo?",
     [("retângulo", True), ("equilátero", False),
      ("isósceles qualquer", False), ("obtusângulo", False)]),
    ("Teorema de Pitágoras", "Médio",
     "Num triângulo retângulo de catetos 3 e 4, a hipotenusa mede:",
     [("5", True), ("6", False), ("7", False), ("25", False)]),
    ("Teorema de Pitágoras", "Médio",
     "Se a hipotenusa mede 13 e um cateto mede 5, o outro cateto mede:",
     [("12", True), ("8", False), ("9", False), ("11", False)]),
    ("Teorema de Pitágoras", "Difícil",
     "A diagonal de um quadrado de lado 1 mede:",
     [("√2", True), ("1", False), ("2", False), ("√3", False)]),
    ("Teorema de Pitágoras", "Difícil",
     "Num triângulo retângulo isósceles, se cada cateto mede 'a', a hipotenusa é:",
     [("a√2", True), ("2a", False), ("a²", False), ("a/2", False)]),
]


def _obter(sessao, modelo, nome):
    obj = sessao.scalar(select(modelo).where(modelo.nome == nome))
    if obj is None:
        raise RuntimeError(f"{modelo.__name__} '{nome}' nao encontrado. Rode os seeds.")
    return obj


def main() -> None:
    with SessionLocal() as sessao:
        serie = _obter(sessao, Serie, SERIE)
        nivel_por_nome = {n.nome: n for n in sessao.scalars(select(Nivel))}

        materia = sessao.scalar(select(Materia).where(Materia.nome == MATERIA))
        if materia is None:
            materia = Materia(nome=MATERIA)
            sessao.add(materia)
            sessao.flush()

        criadas = 0
        for conteudo_nome, nivel_nome, enunciado, alts in QUESTOES:
            if sessao.scalar(select(Questao).where(Questao.enunciado == enunciado)):
                continue

            conteudo = sessao.scalar(
                select(Conteudo).where(
                    Conteudo.nome == conteudo_nome,
                    Conteudo.materia_id == materia.id,
                )
            )
            if conteudo is None:
                conteudo = Conteudo(nome=conteudo_nome, materia=materia)
                sessao.add(conteudo)
                sessao.flush()

            questao = Questao(
                enunciado=enunciado,
                serie=serie,
                materia=materia,
                conteudo=conteudo,
                nivel=nivel_por_nome[nivel_nome],
                adaptacoes=[],
                alternativas=[
                    Alternativa(texto=t, correta=c, ordem_original=i)
                    for i, (t, c) in enumerate(alts, start=1)
                ],
            )
            sessao.add(questao)
            criadas += 1

        sessao.commit()

        total = sessao.scalar(select(Questao.id).order_by(Questao.id.desc()))
        print(f"Questoes criadas agora: {criadas}")
        print(f"Total de questoes no banco: {sessao.query(Questao).count()}")


if __name__ == "__main__":
    main()
