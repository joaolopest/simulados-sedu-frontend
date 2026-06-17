"""Mapas code (frontend) <-> nome de exibição (banco), iguais aos do seed.

O frontend manda série/matéria/nível em code ("9_fundamental", "matematica",
"facil"); o banco guarda por nome ("9º ano", "Matemática", "Fácil"). Usado
pelas agregações que recebem parâmetros do front (ex.: curadoria de simulado).
"""

MAP_SERIE = {
    "1_fundamental": "1º ano",
    "2_fundamental": "2º ano",
    "3_fundamental": "3º ano",
    "4_fundamental": "4º ano",
    "5_fundamental": "5º ano",
    "6_fundamental": "6º ano",
    "7_fundamental": "7º ano",
    "8_fundamental": "8º ano",
    "9_fundamental": "9º ano",
    "1_medio": "1ª série EM",
    "2_medio": "2ª série EM",
    "3_medio": "3ª série EM",
}

MAP_MATERIA = {
    "portugues": "Português",
    "matematica": "Matemática",
    "ciencias": "Ciências",
    "historia": "História",
    "geografia": "Geografia",
    "ingles": "Inglês",
    "artes": "Artes",
    "educacao_fisica": "Educação Física",
    "fisica": "Física",
    "quimica": "Química",
    "biologia": "Biologia",
    "filosofia": "Filosofia",
    "sociologia": "Sociologia",
}

MAP_NIVEL = {"facil": "Fácil", "medio": "Médio", "dificil": "Difícil"}

NIVEL_NOME_PARA_CODE = {v: k for k, v in MAP_NIVEL.items()}


def serie_nome(code: str | None) -> str | None:
    return MAP_SERIE.get(code, code) if code else None


def materia_nome(code: str) -> str:
    return MAP_MATERIA.get(code, code)


def nivel_code(nome: str) -> str:
    return NIVEL_NOME_PARA_CODE.get(nome, nome)
