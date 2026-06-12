from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.services import simulado_service

from app.api.permissoes import so_aluno

router = APIRouter(
    prefix="/respostas",
    tags=["respostas"],
    dependencies=[Depends(so_aluno)],
)


class ResponderRequest(BaseModel):
    aluno_id: int
    simulado_id: int
    questao_id: int
    alternativa_id: int


@router.post("", summary="Salvar resposta do aluno (autosave)")
def responder(req: ResponderRequest, sessao: Session = Depends(get_session)) -> dict:
    try:
        resposta = simulado_service.registrar_resposta(
            sessao,
            aluno_id=req.aluno_id,
            simulado_id=req.simulado_id,
            questao_id=req.questao_id,
            alternativa_id=req.alternativa_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "salvo": True,
        "resposta_id": resposta.id,
        "questao_id": resposta.questao_id,
        "alternativa_id": resposta.alternativa_id,
    }
