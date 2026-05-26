"""Helpers para determinar o vínculo (escola 🔴 / supletivo 🔵) do aluno.

Usado por endpoints da camada do aluno para fazer o gating das funções
que são exclusivas de cada vínculo conforme o quadro do squad.
"""

from fastapi import HTTPException

from app.enums import PerfilUsuario, VinculoAluno
from app.models import Aluno


def obter_vinculo(aluno: Aluno) -> VinculoAluno:
    """Retorna o vínculo armazenado no aluno. Cai pro perfil quando faltar."""
    if aluno.vinculo is not None:
        return aluno.vinculo
    if aluno.usuario and aluno.usuario.perfil == PerfilUsuario.CANDIDATO:
        return VinculoAluno.SUPLETIVO
    return VinculoAluno.ESCOLA


def exigir_vinculo(aluno: Aluno, esperado: VinculoAluno) -> None:
    """Levanta 403 se o aluno não estiver no vínculo esperado."""
    atual = obter_vinculo(aluno)
    if atual is esperado:
        return
    rotulo = (
        "alunos com vínculo escolar"
        if esperado is VinculoAluno.ESCOLA
        else "candidatos sem vínculo escolar (supletivo)"
    )
    raise HTTPException(
        status_code=403,
        detail={
            "codigo": "VINCULO_INCOMPATIVEL",
            "mensagem": f"Esta funcionalidade está disponível apenas para {rotulo}.",
            "vinculo_atual": atual.value,
            "vinculo_esperado": esperado.value,
        },
    )
