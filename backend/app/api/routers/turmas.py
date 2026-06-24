from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_session, require_gestor
from app.repositories import turma_repository

router = APIRouter(
    prefix="/turmas",
    tags=["turmas"],
    dependencies=[Depends(require_gestor)],
)


@router.get("", summary="Listar turmas")
def listar_turmas(sessao: Session = Depends(get_session)) -> list[dict]:
    return [
        {
            "id": t.id,
            "nome": t.nome,
            "ano_letivo": t.ano_letivo,
            "serie": t.serie.nome,
            "escola": t.escola.nome,
        }
        for t in turma_repository.listar(sessao)
    ]
