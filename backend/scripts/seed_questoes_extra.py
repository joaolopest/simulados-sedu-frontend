import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.enums import StatusQuestao  # noqa: E402
from app.models import (  # noqa: E402
    Alternativa,
    Conteudo,
    Escola,
    Materia,
    Nivel,
    Questao,
    Serie,
    Usuario,
)

QUESTOES = [
    ("Português", "9º ano", "Sintaxe", "Fácil",
     "Na frase \"O aluno estuda todos os dias\", qual é o sujeito?",
     [("O aluno", True), ("estuda", False), ("todos os dias", False), ("frase", False)]),
    ("Português", "9º ano", "Classes de palavras", "Fácil",
     "A palavra \"rapidamente\" pertence a qual classe gramatical?",
     [("Advérbio", True), ("Adjetivo", False), ("Substantivo", False), ("Verbo", False)]),
    ("Português", "9º ano", "Ortografia", "Fácil",
     "Assinale a palavra escrita corretamente:",
     [("Exceção", True), ("Esceção", False), ("Excessão", False), ("Eceção", False)]),
    ("Português", "9º ano", "Gêneros textuais", "Médio",
     "Qual destes é um gênero textual jornalístico?",
     [("Notícia", True), ("Soneto", False), ("Fábula", False), ("Receita", False)]),
    ("Português", "9º ano", "Classes de palavras", "Médio",
     "Em \"Comprei um livro novo\", a palavra \"novo\" é um:",
     [("Adjetivo", True), ("Substantivo", False), ("Verbo", False), ("Advérbio", False)]),
    ("Português", "9º ano", "Interpretação de texto", "Médio",
     "A finalidade principal de um texto dissertativo-argumentativo é:",
     [("Defender um ponto de vista", True), ("Narrar uma história", False),
      ("Descrever um lugar", False), ("Ensinar uma receita", False)]),
    ("Português", "9º ano", "Sintaxe", "Difícil",
     "Em \"Embora chovesse, saímos\", a oração \"Embora chovesse\" é subordinada adverbial:",
     [("Concessiva", True), ("Causal", False), ("Temporal", False), ("Final", False)]),

    ("Ciências", "9º ano", "Física", "Fácil",
     "Qual é a unidade de medida de força no Sistema Internacional?",
     [("Newton", True), ("Joule", False), ("Watt", False), ("Pascal", False)]),
    ("Ciências", "9º ano", "Química", "Fácil",
     "A água é formada por quais elementos químicos?",
     [("Hidrogênio e oxigênio", True), ("Carbono e oxigênio", False),
      ("Hidrogênio e carbono", False), ("Nitrogênio e oxigênio", False)]),
    ("Ciências", "9º ano", "Química", "Médio",
     "Qual é a fórmula química da água?",
     [("H2O", True), ("CO2", False), ("O2", False), ("NaCl", False)]),
    ("Ciências", "9º ano", "Física", "Médio",
     "A primeira lei de Newton também é conhecida como lei da:",
     [("Inércia", True), ("Gravidade", False), ("Ação e reação", False), ("Energia", False)]),
    ("Ciências", "9º ano", "Química", "Médio",
     "O que o pH de uma solução mede?",
     [("Acidez ou basicidade", True), ("Temperatura", False),
      ("Densidade", False), ("Velocidade", False)]),
    ("Ciências", "9º ano", "Física", "Difícil",
     "A velocidade da luz no vácuo é de aproximadamente:",
     [("300.000 km/s", True), ("300 km/s", False), ("30.000 km/s", False), ("3.000 km/s", False)]),

    ("História", "9º ano", "Brasil República", "Fácil",
     "Em que ano foi proclamada a República no Brasil?",
     [("1889", True), ("1822", False), ("1500", False), ("1930", False)]),
    ("História", "9º ano", "Brasil República", "Fácil",
     "Quem foi o primeiro presidente do Brasil?",
     [("Deodoro da Fonseca", True), ("Getúlio Vargas", False),
      ("Dom Pedro II", False), ("Floriano Peixoto", False)]),
    ("História", "9º ano", "Brasil Império", "Médio",
     "A Lei Áurea, de 1888, foi responsável por:",
     [("Abolir a escravidão", True), ("Proclamar a independência", False),
      ("Criar a República", False), ("Iniciar a Era Vargas", False)]),
    ("História", "9º ano", "Era Vargas", "Médio",
     "Em que ano teve início a Era Vargas?",
     [("1930", True), ("1889", False), ("1945", False), ("1964", False)]),
    ("História", "9º ano", "Brasil República", "Difícil",
     "A política dominante na República Velha ficou conhecida como:",
     [("Café com leite", True), ("Plano Real", False),
      ("Diretas Já", False), ("Revolução de 30", False)]),

    ("Geografia", "9º ano", "Biomas", "Fácil",
     "Qual é o maior bioma brasileiro em extensão?",
     [("Amazônia", True), ("Cerrado", False), ("Caatinga", False), ("Pantanal", False)]),
    ("Geografia", "9º ano", "Brasil", "Fácil",
     "Qual é a capital do estado de Sergipe?",
     [("Aracaju", True), ("Maceió", False), ("Salvador", False), ("Recife", False)]),
    ("Geografia", "9º ano", "População", "Médio",
     "O deslocamento de pessoas do campo para a cidade é chamado de:",
     [("Êxodo rural", True), ("Imigração", False), ("Nomadismo", False), ("Urbanização rural", False)]),
    ("Geografia", "9º ano", "Globalização", "Médio",
     "A globalização é um processo predominantemente:",
     [("Econômico e cultural", True), ("Apenas militar", False),
      ("Apenas religioso", False), ("Apenas esportivo", False)]),
    ("Geografia", "9º ano", "População", "Difícil",
     "Qual região brasileira possui a maior densidade demográfica?",
     [("Sudeste", True), ("Norte", False), ("Centro-Oeste", False), ("Sul", False)]),

    ("Inglês", "9º ano", "Vocabulário", "Fácil",
     "Qual é a tradução da palavra \"school\"?",
     [("Escola", True), ("Casa", False), ("Rua", False), ("Livro", False)]),
    ("Inglês", "9º ano", "Gramática", "Fácil",
     "What is the plural of \"child\"?",
     [("Children", True), ("Childs", False), ("Childes", False), ("Child", False)]),
    ("Inglês", "9º ano", "Gramática", "Médio",
     "Complete: \"She ___ to school every day.\"",
     [("goes", True), ("go", False), ("going", False), ("gone", False)]),
    ("Inglês", "9º ano", "Gramática", "Médio",
     "What is the past tense of the verb \"go\"?",
     [("went", True), ("goed", False), ("gone", False), ("going", False)]),
]


def main() -> None:
    with SessionLocal() as sessao:
        niveis = {n.nome: n for n in sessao.scalars(select(Nivel))}
        autor = sessao.scalar(select(Usuario).where(Usuario.email == "admin@sedu.se.gov.br"))
        escolas = sessao.scalars(select(Escola).order_by(Escola.id)).all()
        serie_cache: dict[str, Serie] = {}
        criadas = 0

        for indice, (materia_nome, serie_nome, conteudo_nome, nivel_nome, enunciado, alts) in enumerate(QUESTOES):
            if sessao.scalar(select(Questao).where(Questao.enunciado == enunciado)):
                continue

            if serie_nome not in serie_cache:
                serie_cache[serie_nome] = sessao.scalar(
                    select(Serie).where(Serie.nome == serie_nome)
                )
            serie = serie_cache[serie_nome]
            if serie is None:
                continue

            materia = sessao.scalar(select(Materia).where(Materia.nome == materia_nome))
            if materia is None:
                materia = Materia(nome=materia_nome)
                sessao.add(materia)
                sessao.flush()

            conteudo = sessao.scalar(
                select(Conteudo).where(
                    Conteudo.nome == conteudo_nome, Conteudo.materia_id == materia.id
                )
            )
            if conteudo is None:
                conteudo = Conteudo(nome=conteudo_nome, materia=materia)
                sessao.add(conteudo)
                sessao.flush()

            sessao.add(
                Questao(
                    enunciado=enunciado,
                    serie=serie,
                    materia=materia,
                    conteudo=conteudo,
                    nivel=niveis[nivel_nome],
                    adaptacoes=[],
                    status=StatusQuestao.PUBLICADA,
                    criado_por_id=autor.id if autor else None,
                    escola_id=escolas[indice % len(escolas)].id if escolas else None,
                    alternativas=[
                        Alternativa(texto=t, correta=c, ordem_original=i)
                        for i, (t, c) in enumerate(alts, start=1)
                    ],
                )
            )
            criadas += 1

        sessao.commit()
        total = sessao.query(Questao).count()
        materias = sessao.scalars(select(Materia.nome).order_by(Materia.nome)).all()
        print(f"Questoes criadas agora: {criadas}")
        print(f"Total de questoes no banco: {total}")
        print(f"Materias: {', '.join(materias)}")


if __name__ == "__main__":
    main()
