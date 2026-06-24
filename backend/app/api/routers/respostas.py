from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_session, obter_usuario_atual
from app.exceptions import PermissaoNegada
from app.models import Usuario
from app.repositories import usuario_repository
from app.services import simulado_service

router = APIRouter(prefix="/respostas", tags=["respostas"])


class ResponderRequest(BaseModel):
    simulado_id: int
    questao_id: int
    alternativa_id: int


@router.post("", summary="Salvar resposta do aluno autenticado (autosave)")
def responder(
    req: ResponderRequest,
    usuario: Usuario = Depends(obter_usuario_atual),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = usuario_repository.aluno_do_usuario(sessao, usuario.id)
    if aluno is None:
        raise PermissaoNegada(
            "Apenas alunos podem responder simulados", codigo="nao_e_aluno"
        )
    resposta = simulado_service.registrar_resposta(
        sessao,
        aluno_id=aluno.id,
        simulado_id=req.simulado_id,
        questao_id=req.questao_id,
        alternativa_id=req.alternativa_id,
    )
    return {
        "salvo": True,
        "resposta_id": resposta.id,
        "questao_id": resposta.questao_id,
        "alternativa_id": resposta.alternativa_id,
    }
