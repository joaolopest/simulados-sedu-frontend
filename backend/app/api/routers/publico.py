"""Endpoints publicos de leitura para a landing page."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from app.api.deps import get_session
from app.enums import PerfilUsuario
from app.models import Aluno, Escola, Questao, Simulado, Usuario

router = APIRouter(prefix="/public", tags=["public"])


def _iniciais(nome: str) -> str:
    partes = [p for p in nome.split() if p]
    if not partes:
        return "SE"
    if len(partes) == 1:
        return partes[0][:2].upper()
    return f"{partes[0][0]}{partes[-1][0]}".upper()


@router.get("/landing")
def landing_publica(sessao: Session = Depends(get_session)) -> dict:
    escolas = sessao.scalars(
        select(Escola).where(Escola.ativa.is_(True)).order_by(Escola.nome)
    ).all()
    municipios = {e.municipio for e in escolas if e.municipio}

    total_alunos = sessao.scalar(select(func.count(Aluno.id))) or 0
    total_adaptacoes = (
        sessao.scalar(select(func.count(Aluno.id)).where(Aluno.necessita_suporte.is_(True)))
        or 0
    )
    total_simulados = sessao.scalar(select(func.count(Simulado.id))) or 0
    total_questoes = sessao.scalar(select(func.count(Questao.id))) or 0
    total_gestores = (
        sessao.scalar(
            select(func.count(Usuario.id)).where(
                Usuario.perfil == PerfilUsuario.GESTOR,
                Usuario.ativo.is_(True),
            )
        )
        or 0
    )

    escolas_payload = [
        {
            "id": str(e.id),
            "nome": e.nome,
            "municipio": e.municipio or "",
            "uf": e.uf or "ES",
            "inicial": _iniciais(e.nome),
            "totalAlunos": sum(len(t.alunos) for t in e.turmas),
            "totalTurmas": len(e.turmas),
        }
        for e in escolas
    ]

    gestor = sessao.scalar(
        select(Usuario)
        .where(Usuario.perfil == PerfilUsuario.GESTOR, Usuario.escola_id.is_not(None))
        .order_by(Usuario.nome)
    )
    professor = sessao.scalar(
        select(Usuario)
        .where(Usuario.perfil == PerfilUsuario.PROFESSOR, Usuario.escola_id.is_not(None))
        .order_by(Usuario.nome)
    )
    aluno_suporte = sessao.scalar(
        select(Aluno)
        .join(Usuario, Aluno.usuario_id == Usuario.id)
        .where(Aluno.necessita_suporte.is_(True), Usuario.nome.is_not(None))
        .order_by(Usuario.nome)
    )

    depoimentos = []
    if gestor:
        depoimentos.append(
            {
                "nome": gestor.nome,
                "papel": "Coordenacao pedagogica",
                "escola": gestor.escola.nome if gestor.escola else "",
                "tipo": "gestor",
                "quote": (
                    "A leitura por escola e turma ajuda a decidir intervencoes "
                    "com base no que os alunos responderam de fato."
                ),
            }
        )
    if professor:
        depoimentos.append(
            {
                "nome": professor.nome,
                "papel": "Professor",
                "escola": professor.escola.nome if professor.escola else "",
                "tipo": "professor",
                "quote": (
                    "As questoes e provas ficam registradas no banco, entao a "
                    "equipe consegue reaproveitar e revisar o material."
                ),
            }
        )
    if aluno_suporte and aluno_suporte.usuario:
        depoimentos.append(
            {
                "nome": aluno_suporte.usuario.nome,
                "papel": "Estudante com suporte",
                "escola": aluno_suporte.turma.escola.nome if aluno_suporte.turma else "",
                "tipo": "aluno",
                "quote": (
                    "As adaptacoes aparecem no acompanhamento, sem separar o "
                    "aluno do fluxo principal de simulados."
                ),
            }
        )

    return {
        "metricas": {
            "totalEscolas": len(escolas),
            "totalMunicipios": len(municipios),
            "totalAlunos": total_alunos,
            "totalAdaptacoes": total_adaptacoes,
            "totalSimulados": total_simulados,
            "totalQuestoes": total_questoes,
            "totalGestores": total_gestores,
            "anoReferencia": 2026,
        },
        "escolas": escolas_payload,
        "depoimentos": depoimentos,
    }
