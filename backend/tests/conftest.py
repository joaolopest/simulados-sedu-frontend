import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.api.main import app
from app.database import Base
from app.enums import PerfilUsuario
from app.models import (
    Alternativa,
    Aluno,
    Conteudo,
    Escola,
    Materia,
    Nivel,
    Questao,
    Serie,
    Turma,
    Usuario,
)
from app.services import auth_service

SENHA = "sedu123"


@pytest.fixture()
def engine_teste():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_connection, connection_record):
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture()
def Sessao(engine_teste):
    return sessionmaker(bind=engine_teste, expire_on_commit=False)


@pytest.fixture()
def dados(Sessao):
    with Sessao() as s:
        serie = Serie(nome="9º ano")
        niveis = {n: Nivel(nome=n) for n in ("Fácil", "Médio", "Difícil")}
        materia = Materia(nome="Matemática")
        conteudo = Conteudo(nome="Teste", materia=materia)
        s.add_all([serie, materia, conteudo, *niveis.values()])
        s.flush()

        # 2 questões por nível, gabarito sempre na 1ª alternativa cadastrada
        for nivel_nome, nivel in niveis.items():
            for j in range(2):
                q = Questao(
                    enunciado=f"{nivel_nome} {j} - quanto é 1+1?",
                    serie=serie,
                    materia=materia,
                    conteudo=conteudo,
                    nivel=nivel,
                    adaptacoes=[],
                    alternativas=[
                        Alternativa(texto="2", correta=True, ordem_original=1),
                        Alternativa(texto="3", correta=False, ordem_original=2),
                        Alternativa(texto="4", correta=False, ordem_original=3),
                        Alternativa(texto="5", correta=False, ordem_original=4),
                    ],
                )
                s.add(q)

        def cria_usuario(nome, email, perfil):
            u = Usuario(
                nome=nome,
                email=email,
                senha_hash=auth_service.gerar_hash_senha(SENHA),
                perfil=perfil,
            )
            s.add(u)
            return u

        cria_usuario("Admin", "admin@x.gov.br", PerfilUsuario.ADMIN)
        gestor = cria_usuario("Gestor", "gestor@x.gov.br", PerfilUsuario.GESTOR)
        u_aluno = cria_usuario("Aluno", "aluno@x.gov.br", PerfilUsuario.ALUNO)
        u_aluno2 = cria_usuario("Aluno2", "aluno2@x.gov.br", PerfilUsuario.ALUNO)
        s.flush()

        escola = Escola(nome="Escola Teste", municipio="Aracaju")
        turma = Turma(escola=escola, serie=serie, ano_letivo=2026, nome="9A")
        s.add_all([escola, turma])
        s.flush()
        s.add(Aluno(usuario=u_aluno, turma=turma, perfil_cognitivo=[]))
        s.add(Aluno(usuario=u_aluno2, turma=turma, perfil_cognitivo=[]))
        s.commit()
        return {"gestor_id": gestor.id, "turma_id": turma.id}


@pytest.fixture()
def client(Sessao, dados):
    def _get_session():
        s = Sessao()
        try:
            yield s
        except Exception:
            s.rollback()
            raise
        finally:
            s.close()

    app.dependency_overrides[deps.get_session] = _get_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _token(client, email):
    r = client.post("/auth/login", json={"email": email, "senha": SENHA})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture()
def h_gestor(client):
    return {"Authorization": f"Bearer {_token(client, 'gestor@x.gov.br')}"}


@pytest.fixture()
def h_aluno(client):
    return {"Authorization": f"Bearer {_token(client, 'aluno@x.gov.br')}"}


@pytest.fixture()
def h_aluno2(client):
    return {"Authorization": f"Bearer {_token(client, 'aluno2@x.gov.br')}"}
