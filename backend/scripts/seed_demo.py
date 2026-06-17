"""Seed complementar, idempotente e persistente.

Este script nao limpa tabelas. Ele cria apenas dados minimos que faltam para a
aplicacao funcionar sem telas artificiais vazias em um banco novo.
"""

from __future__ import annotations

import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import dominio_labels as labels  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.enums import PerfilUsuario, StatusQuestao, StatusSimulado, VinculoAluno  # noqa: E402
from app.models import (  # noqa: E402
    Aluno,
    Alternativa,
    Conteudo,
    Escola,
    Materia,
    Nivel,
    Notificacao,
    Questao,
    Resposta,
    Serie,
    Simulado,
    SimuladoQuestao,
    Turma,
    Usuario,
)
from app.services import auth_service  # noqa: E402

SENHA_DEMO = "sedu123"
ANO_LETIVO = 2026

LOGIN_PADRAO = {
    "admin@sedu.se.gov.br": "Renata Albuquerque Cardoso",
    "gestor@sedu.se.gov.br": "Lucia Helena Marques",
    "professor@sedu.se.gov.br": "Antonio Carlos Brandao",
    "suporte@sedu.se.gov.br": "Roberto Carlos Nogueira",
    "aluno@sedu.se.gov.br": "Ana Silva Souza",
    "candidato@sedu.se.gov.br": "Marcos Vinicius Andrade",
}

NOMES_LEGADO = {
    "Administrador SEDU": "Renata Albuquerque Cardoso",
    "Gestor Demo": "Lucia Helena Marques",
    "Gestor Escolar Demo": "Lucia Helena Marques",
    "Professor Demo": "Antonio Carlos Brandao",
    "Suporte Demo": "Roberto Carlos Nogueira",
    "Suporte Pedagogico Demo": "Roberto Carlos Nogueira",
    "Aluno Demo": "Ana Silva Souza",
    "Candidato Demo": "Marcos Vinicius Andrade",
}

CODIGOS_INEP_LEGADO = {
    "SEDU-DEMO-001": "32001001",
    "SEDU-DEMO-002": "32001002",
}

SERIE_CODES = [
    "6_fundamental",
    "7_fundamental",
    "8_fundamental",
    "9_fundamental",
    "1_medio",
    "2_medio",
    "3_medio",
]

MATERIA_CODES = [
    "portugues",
    "matematica",
    "ciencias",
    "historia",
    "geografia",
    "ingles",
    "fisica",
    "quimica",
    "biologia",
]

NIVEL_CODES = ["facil", "medio", "dificil"]

ESCOLAS_REDE = [
    {
        "id": "esc_001",
        "nome": "EEEFM Maria Ortiz",
        "codigo_inep": "32011001",
        "municipio": "Vitória",
        "endereco": "Av. Cesar Hilal, 1240 - Praia do Suá",
        "cep": "29052-230",
        "telefone": "(27) 3137-2210",
        "email_contato": "mariaortiz@sedu.es.gov.br",
        "total_professores": 64,
    },
    {
        "id": "esc_002",
        "nome": "EEEFM Coronel Gomes de Oliveira",
        "codigo_inep": "32024108",
        "municipio": "Cachoeiro de Itapemirim",
        "endereco": "Rua Bernardino Monteiro, 425 - Centro",
        "cep": "29300-100",
        "telefone": "(28) 3522-1145",
        "email_contato": "cgomes@sedu.es.gov.br",
        "total_professores": 41,
    },
    {
        "id": "esc_003",
        "nome": "EEEF São José do Calçado Rural",
        "codigo_inep": "32056430",
        "municipio": "Linhares",
        "endereco": "Rodovia ES-440, km 18 - Distrito Bebedouro",
        "cep": "29920-000",
        "telefone": "(27) 3372-4408",
        "email_contato": "saojoserural@sedu.es.gov.br",
        "total_professores": 12,
    },
    {
        "id": "esc_004",
        "nome": "EEEFM Professora Lélia Almeida",
        "codigo_inep": "32088215",
        "municipio": "Vila Velha",
        "endereco": "Av. Luciano das Neves, 2890 - Praia da Costa",
        "cep": "29101-555",
        "telefone": "(27) 3149-7822",
        "email_contato": "leliaalmeida@sedu.es.gov.br",
        "total_professores": 36,
    },
    {
        "id": "esc_005",
        "nome": "EEEFM Dr. Silas Neves",
        "codigo_inep": "32099547",
        "municipio": "Serra",
        "endereco": "Rua das Palmeiras, 78 - Laranjeiras",
        "cep": "29165-680",
        "telefone": "(27) 3251-6034",
        "email_contato": "silasneves@sedu.es.gov.br",
        "total_professores": 28,
    },
]

TURMAS_REDE = [
    ("tur_001", "esc_001", "6_fundamental", "6º Ano A"),
    ("tur_002", "esc_001", "7_fundamental", "7º Ano B"),
    ("tur_003", "esc_001", "1_medio", "1º Médio C"),
    ("tur_004", "esc_001", "3_medio", "3º Médio A"),
    ("tur_005", "esc_002", "6_fundamental", "6º Ano A"),
    ("tur_006", "esc_002", "8_fundamental", "8º Ano B"),
    ("tur_007", "esc_002", "9_fundamental", "9º Ano A"),
    ("tur_008", "esc_002", "2_medio", "2º Médio B"),
    ("tur_009", "esc_003", "6_fundamental", "6º Ano Único"),
    ("tur_010", "esc_003", "7_fundamental", "7º Ano Único"),
    ("tur_011", "esc_003", "8_fundamental", "8º Ano Único"),
    ("tur_012", "esc_003", "9_fundamental", "9º Ano Único"),
    ("tur_013", "esc_004", "7_fundamental", "7º Ano A"),
    ("tur_014", "esc_004", "9_fundamental", "9º Ano B"),
    ("tur_015", "esc_004", "1_medio", "1º Médio A"),
    ("tur_016", "esc_004", "3_medio", "3º Médio B"),
    ("tur_017", "esc_005", "6_fundamental", "6º Ano B"),
    ("tur_018", "esc_005", "8_fundamental", "8º Ano A"),
    ("tur_019", "esc_005", "2_medio", "2º Médio A"),
    ("tur_020", "esc_005", "3_medio", "3º Médio C"),
]

TURMAS_POR_BLOCO = [
    ("tur_001", "esc_001"),
    ("tur_002", "esc_001"),
    ("tur_003", "esc_001"),
    ("tur_004", "esc_001"),
    ("tur_005", "esc_002"),
    ("tur_006", "esc_002"),
    ("tur_007", "esc_002"),
    ("tur_008", "esc_002"),
    ("tur_009", "esc_003"),
    ("tur_010", "esc_003"),
    ("tur_011", "esc_003"),
    ("tur_012", "esc_003"),
    ("tur_013", "esc_004"),
    ("tur_014", "esc_004"),
    ("tur_015", "esc_004"),
    ("tur_016", "esc_004"),
    ("tur_017", "esc_005"),
    ("tur_018", "esc_005"),
    ("tur_019", "esc_005"),
    ("tur_020", "esc_005"),
]

USUARIOS_REDE = [
    ("Renata Albuquerque Cardoso", "renata.cardoso@sedu.es.gov.br", PerfilUsuario.ADMIN, None, "usu_001"),
    ("Marcelo Antônio Ribeiro", "marcelo.ribeiro@sedu.es.gov.br", PerfilUsuario.ADMIN, None, "usu_002"),
    ("Patrícia Mendonça Vieira", "patricia.vieira@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_001", "usu_003"),
    ("Carlos Eduardo Tavares", "carlos.tavares@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_001", "usu_004"),
    ("Fernanda Lúcia Bittencourt", "fernanda.bittencourt@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_001", "usu_005"),
    ("Ricardo Silveira Pacheco", "ricardo.pacheco@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_002", "usu_006"),
    ("Joana Carla Figueiredo", "joana.figueiredo@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_002", "usu_007"),
    ("Antônio Carlos Brandão", "antonio.brandao@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_003", "usu_008"),
    ("Lúcia Helena Marques", "lucia.marques@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_004", "usu_009"),
    ("Diego Henrique Pacheco", "diego.pacheco@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_004", "usu_010"),
    ("Sandra Regina Alvarenga", "sandra.alvarenga@sedu.es.gov.br", PerfilUsuario.GESTOR, "esc_005", "usu_011"),
    ("Roberto Carlos Nogueira", "roberto.nogueira@sedu.es.gov.br", PerfilUsuario.SUPORTE, "esc_001", "usu_211"),
    ("Mariana Pires de Oliveira", "mariana.pires@sedu.es.gov.br", PerfilUsuario.SUPORTE, "esc_002", "usu_212"),
    ("Eduardo Vinícius Lacerda", "eduardo.lacerda@sedu.es.gov.br", PerfilUsuario.SUPORTE, "esc_003", "usu_213"),
    ("Tatiana Souza Mascarenhas", "tatiana.mascarenhas@sedu.es.gov.br", PerfilUsuario.SUPORTE, "esc_004", "usu_214"),
    ("Felipe Augusto Damasceno", "felipe.damasceno@sedu.es.gov.br", PerfilUsuario.SUPORTE, "esc_005", "usu_215"),
]

NOMES_FEMININOS = [
    "Ana",
    "Maria",
    "Beatriz",
    "Júlia",
    "Larissa",
    "Letícia",
    "Sofia",
    "Camila",
    "Isabela",
    "Helena",
    "Mariana",
    "Gabriela",
    "Yasmin",
    "Lívia",
    "Clara",
    "Manuela",
    "Lorena",
    "Rafaela",
    "Bianca",
    "Vitória",
    "Alice",
    "Eduarda",
    "Bruna",
    "Nathália",
    "Fernanda",
    "Carolina",
    "Amanda",
    "Pietra",
    "Cecília",
    "Stella",
]

NOMES_MASCULINOS = [
    "João",
    "Pedro",
    "Lucas",
    "Gabriel",
    "Mateus",
    "Felipe",
    "Rafael",
    "Bruno",
    "Henrique",
    "Davi",
    "Arthur",
    "Bernardo",
    "Miguel",
    "Daniel",
    "Caio",
    "Gustavo",
    "Vitor",
    "Thiago",
    "Leonardo",
    "Murilo",
    "Enzo",
    "Diego",
    "Eduardo",
    "Igor",
    "Vinícius",
    "Samuel",
    "Heitor",
    "Otávio",
    "Théo",
    "Yuri",
]

SOBRENOMES = [
    "Silva",
    "Santos",
    "Oliveira",
    "Souza",
    "Rodrigues",
    "Ferreira",
    "Almeida",
    "Pereira",
    "Lima",
    "Gomes",
    "Costa",
    "Ribeiro",
    "Martins",
    "Carvalho",
    "Alves",
    "Pinto",
    "Moreira",
    "Cardoso",
    "Teixeira",
    "Correia",
    "Mendes",
    "Barbosa",
    "Rocha",
    "Dias",
    "Nunes",
    "Marques",
    "Cavalcanti",
    "Monteiro",
    "Freitas",
    "Castro",
    "Andrade",
    "Vieira",
    "Cruz",
    "Brandão",
    "Coutinho",
]

POSSIVEIS_ADAPTACOES = [
    "tdah",
    "tdah",
    "tdah",
    "dislexia",
    "dislexia",
    "discalculia",
    "autismo",
    "deficiencia_visual",
    "deficiencia_auditiva",
]


def main() -> None:
    with SessionLocal() as sessao:
        series = {
            code: _get_or_create_serie(sessao, labels.serie_nome(code))
            for code in SERIE_CODES
        }
        materias = {
            code: _get_or_create_materia(sessao, labels.materia_nome(code))
            for code in MATERIA_CODES
        }
        niveis = {
            code: _get_or_create_nivel(sessao, labels.MAP_NIVEL[code])
            for code in NIVEL_CODES
        }

        escola = _get_or_create_escola(
            sessao,
            nome="Escola Estadual Professor Anisio Teixeira",
            codigo_inep="32001001",
            municipio="Vitoria",
        )
        escola2 = _get_or_create_escola(
            sessao,
            nome="Escola Estadual Maria Ortiz",
            codigo_inep="32001002",
            municipio="Vila Velha",
        )

        turma_9a = _get_or_create_turma(
            sessao, escola, series["9_fundamental"], "9A", ANO_LETIVO
        )
        turma_8b = _get_or_create_turma(
            sessao, escola2, series["8_fundamental"], "8B", ANO_LETIVO
        )
        escolas_rede, turmas_rede = _seed_rede_escolar(sessao, series)

        admin = _get_or_create_usuario(
            sessao,
            "Renata Albuquerque Cardoso",
            "admin@sedu.se.gov.br",
            PerfilUsuario.ADMIN,
        )
        gestor = _get_or_create_usuario(
            sessao,
            "Lucia Helena Marques",
            "gestor@sedu.se.gov.br",
            PerfilUsuario.GESTOR,
            escola,
        )
        professor = _get_or_create_usuario(
            sessao,
            "Antonio Carlos Brandao",
            "professor@sedu.se.gov.br",
            PerfilUsuario.PROFESSOR,
            escola,
        )
        suporte = _get_or_create_usuario(
            sessao,
            "Roberto Carlos Nogueira",
            "suporte@sedu.se.gov.br",
            PerfilUsuario.SUPORTE,
            escola,
        )
        escola_demo_rede = escolas_rede.get("esc_001")
        if escola_demo_rede is not None:
            gestor.escola_id = escola_demo_rede.id
            professor.escola_id = escola_demo_rede.id
            suporte.escola_id = escola_demo_rede.id
        aluno_usuario = _get_or_create_usuario(
            sessao,
            "Ana Silva Souza",
            "aluno@sedu.se.gov.br",
            PerfilUsuario.ALUNO,
            escola,
        )
        candidato_usuario = _get_or_create_usuario(
            sessao,
            "Marcos Vinicius Andrade",
            "candidato@sedu.se.gov.br",
            PerfilUsuario.CANDIDATO,
        )

        aluno = _get_or_create_aluno(sessao, aluno_usuario, turma_9a)
        _get_or_create_aluno(
            sessao,
            candidato_usuario,
            None,
            vinculo=VinculoAluno.SUPLETIVO,
        )
        aluno.necessita_suporte = True
        aluno.perfil_cognitivo = aluno.perfil_cognitivo or ["tdah"]

        questoes = _criar_questoes_minimas(
            sessao,
            escola=escola,
            criador=professor,
            admin=admin,
            series=series,
            materias=materias,
            niveis=niveis,
        )
        _normalizar_questoes_legado(sessao, escolas_rede, admin)

        simulado = _get_or_create_simulado(sessao, gestor, turma_9a, questoes[:4])
        _get_or_create_respostas_demo(sessao, aluno, simulado)
        _get_or_create_notificacao(sessao, aluno_usuario, simulado)
        _normalizar_identidades_legado(sessao)

        sessao.commit()

    print("Seed complementar concluido.")


def _get_or_create_serie(sessao, nome: str) -> Serie:
    obj = sessao.scalar(select(Serie).where(Serie.nome == nome))
    if obj is None:
        obj = Serie(nome=nome)
        sessao.add(obj)
        sessao.flush()
    return obj


def _get_or_create_materia(sessao, nome: str) -> Materia:
    obj = sessao.scalar(select(Materia).where(Materia.nome == nome))
    if obj is None:
        obj = Materia(nome=nome)
        sessao.add(obj)
        sessao.flush()
    return obj


def _get_or_create_nivel(sessao, nome: str) -> Nivel:
    obj = sessao.scalar(select(Nivel).where(Nivel.nome == nome))
    if obj is None:
        obj = Nivel(nome=nome)
        sessao.add(obj)
        sessao.flush()
    return obj


def _get_or_create_conteudo(sessao, nome: str, materia: Materia) -> Conteudo:
    obj = sessao.scalar(
        select(Conteudo).where(Conteudo.nome == nome, Conteudo.materia_id == materia.id)
    )
    if obj is None:
        obj = Conteudo(nome=nome, materia_id=materia.id)
        sessao.add(obj)
        sessao.flush()
    return obj


def _get_or_create_escola(sessao, nome: str, codigo_inep: str, municipio: str) -> Escola:
    obj = sessao.scalar(select(Escola).where(Escola.codigo_inep == codigo_inep))
    if obj is None:
        codigo_legado = next(
            (antigo for antigo, novo in CODIGOS_INEP_LEGADO.items() if novo == codigo_inep),
            None,
        )
        if codigo_legado is not None:
            obj = sessao.scalar(select(Escola).where(Escola.codigo_inep == codigo_legado))
    if obj is None:
        obj = Escola(
            nome=nome,
            codigo_inep=codigo_inep,
            municipio=municipio,
            uf="ES",
            ativa=True,
            total_professores=0,
        )
        sessao.add(obj)
        sessao.flush()
    else:
        if obj.codigo_inep in CODIGOS_INEP_LEGADO:
            obj.codigo_inep = CODIGOS_INEP_LEGADO[obj.codigo_inep]
        obj.nome = nome if not obj.nome or "Demo" in obj.nome else obj.nome
        obj.municipio = obj.municipio or municipio
        obj.uf = obj.uf or "ES"
        obj.ativa = True
    return obj


def _atualizar_escola(escola: Escola, dados: dict) -> Escola:
    escola.nome = escola.nome or dados["nome"]
    escola.municipio = escola.municipio or dados["municipio"]
    escola.uf = escola.uf or "ES"
    escola.endereco = escola.endereco or dados.get("endereco")
    escola.cep = escola.cep or dados.get("cep")
    escola.telefone = escola.telefone or dados.get("telefone")
    escola.email_contato = escola.email_contato or dados.get("email_contato")
    escola.total_professores = escola.total_professores or dados.get("total_professores", 0)
    escola.ativa = True
    return escola


def _seed_rede_escolar(
    sessao,
    series: dict[str, Serie],
) -> tuple[dict[str, Escola], dict[str, Turma]]:
    escolas: dict[str, Escola] = {}
    turmas: dict[str, Turma] = {}

    for dados in ESCOLAS_REDE:
        escola = _get_or_create_escola(
            sessao,
            nome=dados["nome"],
            codigo_inep=dados["codigo_inep"],
            municipio=dados["municipio"],
        )
        escolas[dados["id"]] = _atualizar_escola(escola, dados)

    for turma_id, escola_id, serie_code, nome in TURMAS_REDE:
        turmas[turma_id] = _get_or_create_turma(
            sessao,
            escolas[escola_id],
            series[serie_code],
            nome,
            ANO_LETIVO,
        )

    for nome, email, perfil, escola_ref, avatar_seed in USUARIOS_REDE:
        _get_or_create_usuario(
            sessao,
            nome,
            email,
            perfil,
            escolas.get(escola_ref) if escola_ref else None,
            foto_url=_avatar_url(avatar_seed),
            reativar=False,
        )

    for indice in range(200):
        numero = 100 + indice
        turma_ref, escola_ref = TURMAS_POR_BLOCO[indice // 10]
        nome = _nome_aluno(indice)
        adaptacoes = _gerar_adaptacoes_para(indice)
        usuario = _get_or_create_usuario(
            sessao,
            nome,
            _email_de_aluno(nome, numero),
            PerfilUsuario.ALUNO,
            escolas[escola_ref],
            ativo=indice % 47 != 0,
            foto_url=_avatar_url(f"usu_{numero:03d}"),
            ultimo_acesso=_ultimo_acesso_variado(indice),
            reativar=False,
        )
        aluno = _get_or_create_aluno(sessao, usuario, turmas[turma_ref])
        aluno.turma_id = turmas[turma_ref].id
        aluno.vinculo = VinculoAluno.ESCOLA
        aluno.perfil_cognitivo = adaptacoes
        aluno.necessita_suporte = bool(adaptacoes)

    return escolas, turmas


def _avatar_url(seed: str) -> str:
    return f"https://api.dicebear.com/7.x/avataaars-neutral/svg?seed={seed}"


def _sem_acentos(valor: str) -> str:
    normalizado = unicodedata.normalize("NFD", valor)
    return "".join(ch for ch in normalizado if unicodedata.category(ch) != "Mn")


def _nome_aluno(indice: int) -> str:
    lista = NOMES_FEMININOS if indice % 2 == 0 else NOMES_MASCULINOS
    nome = lista[indice % len(lista)]
    sobrenome1 = SOBRENOMES[(indice * 7) % len(SOBRENOMES)]
    sobrenome2 = SOBRENOMES[(indice * 11 + 3) % len(SOBRENOMES)]
    return f"{nome} {sobrenome1} {sobrenome2}"


def _email_de_aluno(nome_completo: str, numero: int) -> str:
    partes = _sem_acentos(nome_completo).lower().split()
    return f"{partes[0]}.{partes[-1]}{numero}@aluno.sedu.es.gov.br"


def _ultimo_acesso_variado(indice: int) -> datetime:
    dia = 28 - (indice % 14)
    hora = 8 + ((indice * 3) % 14)
    minuto = (indice * 7) % 60
    return datetime.fromisoformat(
        f"2026-04-{dia:02d}T{hora:02d}:{minuto:02d}:00-03:00"
    )


def _gerar_adaptacoes_para(indice: int) -> list[str]:
    semente = (indice * 31 + 7) % 100
    if semente >= 70:
        return []
    principal = POSSIVEIS_ADAPTACOES[semente % len(POSSIVEIS_ADAPTACOES)]
    if semente % 13 == 0:
        secundaria = POSSIVEIS_ADAPTACOES[
            (semente + 4) % len(POSSIVEIS_ADAPTACOES)
        ]
        if secundaria != principal:
            return [principal, secundaria]
    return [principal]


def _get_or_create_turma(
    sessao,
    escola: Escola,
    serie: Serie,
    nome: str,
    ano_letivo: int,
) -> Turma:
    obj = sessao.scalar(
        select(Turma).where(
            Turma.escola_id == escola.id,
            Turma.serie_id == serie.id,
            Turma.nome == nome,
            Turma.ano_letivo == ano_letivo,
        )
    )
    if obj is None:
        obj = Turma(
            escola_id=escola.id,
            serie_id=serie.id,
            nome=nome,
            ano_letivo=ano_letivo,
        )
        sessao.add(obj)
        sessao.flush()
    return obj


def _get_or_create_usuario(
    sessao,
    nome: str,
    email: str,
    perfil: PerfilUsuario,
    escola: Escola | None = None,
    *,
    ativo: bool = True,
    foto_url: str | None = None,
    ultimo_acesso: datetime | None = None,
    reativar: bool = True,
) -> Usuario:
    obj = sessao.scalar(select(Usuario).where(Usuario.email == email))
    if obj is None:
        obj = Usuario(
            nome=nome,
            email=email,
            senha_hash=auth_service.gerar_hash_senha(SENHA_DEMO),
            perfil=perfil,
            escola_id=escola.id if escola else None,
            ativo=ativo,
            foto_url=foto_url,
            ultimo_acesso=ultimo_acesso,
        )
        sessao.add(obj)
        sessao.flush()
    else:
        obj.nome = obj.nome or nome
        obj.perfil = obj.perfil or perfil
        if escola is not None and obj.escola_id is None:
            obj.escola_id = escola.id
        if foto_url is not None and obj.foto_url is None:
            obj.foto_url = foto_url
        if ultimo_acesso is not None and obj.ultimo_acesso is None:
            obj.ultimo_acesso = ultimo_acesso
        if reativar and not obj.ativo:
            obj.ativo = True
        nome_padrao = LOGIN_PADRAO.get(email)
        if obj.nome in NOMES_LEGADO:
            obj.nome = NOMES_LEGADO[obj.nome]
        elif nome_padrao and obj.nome in ("", nome, "Administrador SEDU"):
            obj.nome = nome_padrao
    return obj


def _get_or_create_aluno(
    sessao,
    usuario: Usuario,
    turma: Turma | None,
    vinculo: VinculoAluno = VinculoAluno.ESCOLA,
) -> Aluno:
    obj = sessao.scalar(select(Aluno).where(Aluno.usuario_id == usuario.id))
    if obj is None:
        obj = Aluno(
            usuario_id=usuario.id,
            turma_id=turma.id if turma else None,
            vinculo=vinculo,
            perfil_cognitivo=[],
            necessita_suporte=False,
        )
        sessao.add(obj)
        sessao.flush()
    elif turma is not None and obj.turma_id is None:
        obj.turma_id = turma.id
    return obj


def _criar_questoes_minimas(
    sessao,
    *,
    escola: Escola,
    criador: Usuario,
    admin: Usuario,
    series: dict[str, Serie],
    materias: dict[str, Materia],
    niveis: dict[str, Nivel],
) -> list[Questao]:
    especificacoes = [
        (
            "Resolva a equacao 2x + 6 = 18.",
            "matematica",
            "Equações do 1º grau",
            "medio",
            ["x = 4", "x = 5", "x = 6", "x = 8"],
            2,
        ),
        (
            "Em um texto narrativo, qual elemento apresenta o conflito principal?",
            "portugues",
            "Interpretação de texto",
            "medio",
            ["Personagem", "Enredo", "Climax", "Desfecho"],
            2,
        ),
        (
            "Qual processo permite que plantas produzam glicose usando luz solar?",
            "ciencias",
            "Fotossíntese",
            "facil",
            ["Respiração", "Fotossíntese", "Fermentação", "Evaporação"],
            1,
        ),
        (
            "A Revolução Industrial teve como uma de suas marcas principais:",
            "historia",
            "Revolução Industrial",
            "medio",
            ["trabalho artesanal", "mecanizacao da producao", "fim das cidades", "escambo"],
            1,
        ),
        (
            "Qual alternativa apresenta uma caracteristica de clima tropical?",
            "geografia",
            "Climas do Brasil",
            "facil",
            ["invernos polares", "chuvas e calor em parte do ano", "neve constante", "ausencia de sol"],
            1,
        ),
        (
            "Choose the correct translation for 'I am studying'.",
            "ingles",
            "Present continuous",
            "facil",
            ["Eu estudei", "Eu estudo", "Eu estou estudando", "Eu estudarei"],
            2,
        ),
        (
            "Um corpo em MRU mantem:",
            "fisica",
            "Movimento retilíneo uniforme",
            "medio",
            ["velocidade constante", "aceleracao crescente", "repouso obrigatorio", "trajetoria circular"],
            0,
        ),
        (
            "Em uma mistura homogenea, os componentes:",
            "quimica",
            "Misturas",
            "facil",
            ["formam fases visiveis", "nao podem ser separados", "apresentam uma unica fase", "viram substancia pura"],
            2,
        ),
    ]
    saida: list[Questao] = []
    for indice, (enunciado, materia_code, conteudo_nome, nivel_code, alternativas, correta) in enumerate(
        especificacoes
    ):
        existente = sessao.scalar(select(Questao).where(Questao.enunciado == enunciado))
        if existente is not None:
            saida.append(existente)
            continue

        materia = materias[materia_code]
        conteudo = _get_or_create_conteudo(sessao, conteudo_nome, materia)
        questao = Questao(
            enunciado=enunciado,
            serie_id=series["9_fundamental"].id,
            materia_id=materia.id,
            conteudo_id=conteudo.id,
            nivel_id=niveis[nivel_code].id,
            adaptacoes=[],
            status=StatusQuestao.PUBLICADA,
            tempo_estimado_segundos=75,
            competencias=[conteudo_nome],
            explicacao=None,
            criado_por_id=criador.id if indice < 6 else admin.id,
            escola_id=escola.id,
        )
        sessao.add(questao)
        sessao.flush()
        for ordem, texto in enumerate(alternativas):
            sessao.add(
                Alternativa(
                    questao_id=questao.id,
                    texto=texto,
                    correta=ordem == correta,
                    ordem_original=ordem + 1,
                )
            )
        saida.append(questao)
    sessao.flush()
    return saida


def _normalizar_questoes_legado(
    sessao,
    escolas_rede: dict[str, Escola],
    admin: Usuario,
) -> None:
    """Preenche etiquetas de autoria/escola em questoes antigas.

    Scripts anteriores criavam questoes publicadas globais sem escola/autor. Para
    manter a matriz de permissao atual, preservamos o conteudo e apenas ligamos o
    legado a escolas reais da rede, distribuindo por id de questao.
    """
    escolas = [escolas_rede[chave] for chave in sorted(escolas_rede) if chave in escolas_rede]
    if not escolas:
        return
    questoes = sessao.scalars(
        select(Questao).where(
            (Questao.escola_id.is_(None)) | (Questao.criado_por_id.is_(None))
        )
    ).all()
    for questao in questoes:
        if questao.criado_por_id is None:
            questao.criado_por_id = admin.id
        if questao.escola_id is None:
            questao.escola_id = escolas[(questao.id - 1) % len(escolas)].id


def _get_or_create_simulado(
    sessao,
    gestor: Usuario,
    turma: Turma,
    questoes: list[Questao],
) -> Simulado:
    titulo = "Diagnostica 9A"
    obj = sessao.scalar(
        select(Simulado).where(Simulado.turma_id == turma.id, Simulado.titulo == titulo)
    )
    if obj is None:
        obj = Simulado(
            gestor_id=gestor.id,
            turma_id=turma.id,
            titulo=titulo,
            parametros_json={
                "nome": titulo,
                "turmaId": str(turma.id),
                "serie": "9_fundamental",
                "materias": ["matematica", "portugues", "ciencias", "historia"],
                "conteudos": [],
                "quantidadeQuestoes": len(questoes),
                "distribuicao": {"facil": 50, "medio": 50, "dificil": 0},
                "adaptacoesAceitas": [],
                "tempoLimiteMinutos": 45,
                "liberadoEm": datetime.now(timezone.utc).date().isoformat(),
            },
            status=StatusSimulado.LIBERADO,
        )
        sessao.add(obj)
        sessao.flush()
    if not obj.questoes:
        for ordem, questao in enumerate(questoes):
            sessao.add(
                SimuladoQuestao(
                    simulado_id=obj.id,
                    questao_id=questao.id,
                    ordem_questao=ordem,
                    alternativas_ordem=[],
                )
            )
    return obj


def _get_or_create_respostas_demo(sessao, aluno: Aluno, simulado: Simulado) -> None:
    for sq in simulado.questoes[:2]:
        existe = sessao.scalar(
            select(Resposta).where(
                Resposta.aluno_id == aluno.id,
                Resposta.simulado_id == simulado.id,
                Resposta.questao_id == sq.questao_id,
            )
        )
        if existe is not None or not sq.questao.alternativas:
            continue
        alternativa = sq.questao.alternativas[0]
        sessao.add(
            Resposta(
                aluno_id=aluno.id,
                simulado_id=simulado.id,
                questao_id=sq.questao_id,
                alternativa_id=alternativa.id,
                correta=alternativa.correta,
            )
        )


def _get_or_create_notificacao(sessao, aluno: Usuario, simulado: Simulado) -> None:
    existe = sessao.scalar(
        select(Notificacao).where(
            Notificacao.destinatario_id == aluno.id,
            Notificacao.tipo == "simulado_liberado",
            Notificacao.origem_id == str(simulado.id),
        )
    )
    if existe is not None:
        return
    sessao.add(
        Notificacao(
            tipo="simulado_liberado",
            titulo="Simulado disponivel",
            mensagem=f'O simulado "{simulado.titulo}" esta disponivel para sua turma.',
            destinatario_id=aluno.id,
            origem_id=str(simulado.id),
            origem_tipo="simulado",
            acao_url=f"/aluno/simulado/{simulado.id}/instrucoes",
            acao_label="Iniciar simulado",
        )
    )


def _normalizar_identidades_legado(sessao) -> None:
    """Atualiza nomes/codigos antigos do seed sem apagar historico do banco."""
    for antigo, novo in NOMES_LEGADO.items():
        sessao.execute(
            text("UPDATE usuarios SET nome = :novo WHERE nome = :antigo"),
            {"novo": novo, "antigo": antigo},
        )
        sessao.execute(
            text("UPDATE acoes_auditoria SET usuario_nome = :novo WHERE usuario_nome = :antigo"),
            {"novo": novo, "antigo": antigo},
        )
        sessao.execute(
            text(
                """
                UPDATE acoes_auditoria
                SET detalhes = replace(detalhes, :antigo, :novo)
                WHERE detalhes IS NOT NULL AND detalhes LIKE :padrao
                """
            ),
            {"novo": novo, "antigo": antigo, "padrao": f"%{antigo}%"},
        )

    for email, nome in LOGIN_PADRAO.items():
        sessao.execute(
            text(
                """
                UPDATE usuarios
                SET nome = :nome
                WHERE email = :email
                  AND nome IN (
                    'Administrador SEDU',
                    'Gestor Demo',
                    'Gestor Escolar Demo',
                    'Professor Demo',
                    'Suporte Demo',
                    'Suporte Pedagogico Demo',
                    'Aluno Demo',
                    'Candidato Demo'
                  )
                """
            ),
            {"nome": nome, "email": email},
        )

    for antigo, novo in CODIGOS_INEP_LEGADO.items():
        sessao.execute(
            text("UPDATE escolas SET codigo_inep = :novo WHERE codigo_inep = :antigo"),
            {"novo": novo, "antigo": antigo},
        )

    sessao.execute(
        text("UPDATE simulados SET titulo = 'Diagnostica 9A' WHERE titulo = 'Diagnostica Demo - 9A'")
    )


if __name__ == "__main__":
    main()
