from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models import Questao
from app.repositories import questao_repository
from app.services import questao_service

router = APIRouter(prefix="/questoes", tags=["questoes"])


class AlternativaIn(BaseModel):
    texto: str
    correta: bool = False


class CadastrarQuestaoRequest(BaseModel):
    enunciado: str = Field(..., examples=["Qual é a raiz de 2x - 8 = 0?"])
    serie: str = Field(..., examples=["9º ano"])
    materia: str = Field(..., examples=["Matemática"])
    conteudo: str = Field(..., examples=["Funções"])
    nivel: str = Field(..., examples=["Fácil"])
    adaptacoes: list[str] = []
    alternativas: list[AlternativaIn]


def _serializar(questao: Questao) -> dict:
    return {
        "id": questao.id,
        "enunciado": questao.enunciado,
        "serie": questao.serie.nome,
        "materia": questao.materia.nome,
        "conteudo": questao.conteudo.nome,
        "nivel": questao.nivel.nome,
        "adaptacoes": questao.adaptacoes,
        "alternativas": [
            {
                "id": alt.id,
                "texto": alt.texto,
                "correta": alt.correta,
                "ordem_original": alt.ordem_original,
            }
            for alt in questao.alternativas
        ],
    }


@router.get("", summary="Listar e filtrar questões do banco")
def listar_questoes(
    serie: str | None = Query(None, description="Ex.: '9º ano'"),
    materia: str | None = Query(None, description="Ex.: 'Matemática'"),
    conteudo: str | None = Query(None, description="Ex.: 'Funções'"),
    nivel: str | None = Query(None, description="Fácil, Médio ou Difícil"),
    limite: int = Query(20, ge=1, le=200),
    sessao: Session = Depends(get_session),
) -> list[dict]:
    questoes = questao_repository.filtrar_questoes(
        sessao,
        serie=serie,
        materia=materia,
        conteudos=[conteudo] if conteudo else None,
        nivel=nivel,
        limite=limite,
    )
    return [_serializar(q) for q in questoes]


@router.post("", summary="Cadastrar uma questão")
def cadastrar_questao(
    req: CadastrarQuestaoRequest, sessao: Session = Depends(get_session)
) -> dict:
    try:
        questao = questao_service.cadastrar_questao(
            sessao,
            enunciado=req.enunciado,
            serie=req.serie,
            materia=req.materia,
            conteudo=req.conteudo,
            nivel=req.nivel,
            alternativas=[a.model_dump() for a in req.alternativas],
            adaptacoes=req.adaptacoes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serializar(questao)
