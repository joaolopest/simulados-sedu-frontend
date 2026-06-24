"""Popula a estrutura de demonstração: usuários (admin/gestor/aluno), escola,
turma e o vínculo do aluno. Idempotente — pode rodar de novo sem duplicar.

Pré-requisito: python scripts/seed_etiquetas.py (precisa existir a série '9º ano').
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.enums import PerfilUsuario  # noqa: E402
from app.models import Aluno, Escola, Serie, Turma, Usuario  # noqa: E402
from app.services import auth_service  # noqa: E402

SENHA_DEMO = "sedu123"

USUARIOS = [
    ("Administrador SEDU", "admin@sedu.se.gov.br", PerfilUsuario.ADMIN),
    ("Maria Gestora", "gestor@sedu.se.gov.br", PerfilUsuario.GESTOR),
    ("João Aluno", "aluno@sedu.se.gov.br", PerfilUsuario.ALUNO),
]


def _obter_ou_criar_usuario(sessao, nome, email, perfil) -> Usuario:
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == email))
    senha_hash = auth_service.gerar_hash_senha(SENHA_DEMO)
    if usuario is None:
        usuario = Usuario(nome=nome, email=email, senha_hash=senha_hash, perfil=perfil)
        sessao.add(usuario)
        sessao.flush()
    else:
        usuario.senha_hash = senha_hash
        usuario.perfil = perfil
        usuario.ativo = True
    return usuario


def main() -> None:
    with SessionLocal() as sessao:
        serie = sessao.scalar(select(Serie).where(Serie.nome == "9º ano"))
        if serie is None:
            raise RuntimeError("Série '9º ano' não existe. Rode antes: scripts/seed_etiquetas.py")

        usuarios = {
            email: _obter_ou_criar_usuario(sessao, nome, email, perfil)
            for nome, email, perfil in USUARIOS
        }

        escola = sessao.scalar(select(Escola).where(Escola.nome == "Escola Estadual Modelo"))
        if escola is None:
            escola = Escola(
                nome="Escola Estadual Modelo", municipio="Aracaju", codigo_inep="28DEMO00"
            )
            sessao.add(escola)
            sessao.flush()

        turma = sessao.scalar(
            select(Turma).where(Turma.escola_id == escola.id, Turma.nome == "9A")
        )
        if turma is None:
            turma = Turma(escola=escola, serie=serie, ano_letivo=2026, nome="9A")
            sessao.add(turma)
            sessao.flush()

        usuario_aluno = usuarios["aluno@sedu.se.gov.br"]
        aluno = sessao.scalar(select(Aluno).where(Aluno.usuario_id == usuario_aluno.id))
        if aluno is None:
            aluno = Aluno(usuario=usuario_aluno, turma=turma, perfil_cognitivo=[])
            sessao.add(aluno)
            sessao.flush()

        sessao.commit()

        print("=== Estrutura de demonstração pronta ===")
        print(f"Escola: {escola.nome} | Turma: {turma.nome} ({serie.nome})")
        print(f"Senha de todos os usuários demo: {SENHA_DEMO}")
        for nome, email, perfil in USUARIOS:
            print(f"  {perfil.value:8} {email}")


if __name__ == "__main__":
    main()
