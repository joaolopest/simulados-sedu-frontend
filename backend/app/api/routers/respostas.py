from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models import Usuario
from app.services import auditoria_service
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
def responder(
    req: ResponderRequest,
    request: Request,
    usuario: Usuario = Depends(so_aluno),
    sessao: Session = Depends(get_session),
) -> dict:
    if usuario.aluno is None or usuario.aluno.id != req.aluno_id:
        raise HTTPException(status_code=403, detail="Aluno so pode responder por si mesmo.")
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

    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="responder_questao",
        alvo_tipo="simulado",
        alvo_id=req.simulado_id,
        detalhes=f"Aluno #{req.aluno_id} respondeu questao #{req.questao_id}.",
        request=request,
    )
    sessao.commit()

    return {
        "salvo": True,
        "resposta_id": resposta.id,
        "questao_id": resposta.questao_id,
        "alternativa_id": resposta.alternativa_id,
    }
