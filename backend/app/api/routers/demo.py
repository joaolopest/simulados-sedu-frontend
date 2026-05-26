from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import PerfilUsuario
from app.models import Aluno, Escola, Serie, Turma, Usuario

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/preparar", summary="Preparar dados de demonstração (escola, turma, gestor, aluno)")
def preparar_estrutura(sessao: Session = Depends(get_session)) -> dict:
    serie = sessao.scalar(select(Serie).where(Serie.nome == "9º ano")) or sessao.scalar(
        select(Serie).order_by(Serie.id)
    )
    if serie is None:
        raise ValueError("Nenhuma série cadastrada. Rode seed_etiquetas.py.")

    escola = sessao.scalar(select(Escola).where(Escola.nome == "Escola Demo"))
    if escola is None:
        escola = Escola(nome="Escola Demo", municipio="Aracaju", codigo_inep="28DEMO00")
        sessao.add(escola)
        sessao.flush()

    turma = sessao.scalar(
        select(Turma).where(Turma.escola_id == escola.id, Turma.nome == "9A")
    )
    if turma is None:
        turma = Turma(escola=escola, serie=serie, ano_letivo=2026, nome="9A")
        sessao.add(turma)
        sessao.flush()

    gestor = sessao.scalar(
        select(Usuario).where(Usuario.email == "gestor.demo@sedu.se.gov.br")
    )
    if gestor is None:
        gestor = Usuario(
            nome="Gestor Demo",
            email="gestor.demo@sedu.se.gov.br",
            senha_hash="placeholder",
            perfil=PerfilUsuario.GESTOR,
        )
        sessao.add(gestor)
        sessao.flush()

    usuario_aluno = sessao.scalar(
        select(Usuario).where(Usuario.email == "aluno.demo@sedu.se.gov.br")
    )
    if usuario_aluno is None:
        usuario_aluno = Usuario(
            nome="Aluno Demo",
            email="aluno.demo@sedu.se.gov.br",
            senha_hash="placeholder",
            perfil=PerfilUsuario.ALUNO,
        )
        sessao.add(usuario_aluno)
        sessao.flush()

    aluno = sessao.scalar(select(Aluno).where(Aluno.usuario_id == usuario_aluno.id))
    if aluno is None:
        aluno = Aluno(usuario=usuario_aluno, turma=turma, perfil_cognitivo=[])
        sessao.add(aluno)
        sessao.flush()

    sessao.commit()

    return {
        "gestor_id": gestor.id,
        "turma_id": turma.id,
        "aluno_id": aluno.id,
        "serie": serie.nome,
        "escola": escola.nome,
        "turma": turma.nome,
    }
