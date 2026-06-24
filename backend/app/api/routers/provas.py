from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session, require_gestor
from app.services import prova_service

router = APIRouter(prefix="/provas", tags=["provas"])


class GerarProvaRequest(BaseModel):
    serie: str = Field(..., examples=["9º ano"])
    materia: str | None = Field(None, examples=["Matemática"])
    materias: list[str] | None = Field(None, examples=[["Matemática", "Português"]])
    conteudos: list[str] | None = Field(None, examples=[["Funções", "Equação do 2º grau"]])
    distribuicao: dict[str, float] | None = Field(
        None,
        description="Proporção por nível. Ex.: {'Fácil':0.3,'Médio':0.5,'Difícil':0.2}",
        examples=[{"Fácil": 0.3, "Médio": 0.5, "Difícil": 0.2}],
    )
    quantidade: int = Field(10, ge=1, le=100)
    adaptacoes: list[str] | None = Field(None, examples=[["tdah"]])
    seed: int | None = Field(None, description="Fixa o sorteio para reproduzir o resultado")


@router.post(
    "/gerar",
    summary="Gerar prova avulsa (sorteio balanceado + embaralhamento)",
    dependencies=[Depends(require_gestor)],
)
def gerar_prova(
    req: GerarProvaRequest,
    sessao: Session = Depends(get_session),
) -> dict:
    prova = prova_service.gerar_prova(
        sessao,
        serie=req.serie,
        materia=req.materia,
        materias=req.materias,
        conteudos=req.conteudos,
        distribuicao=req.distribuicao,
        quantidade=req.quantidade,
        adaptacoes=req.adaptacoes,
        seed=req.seed,
    )

    return {
        "parametros": {
            "serie": req.serie,
            "materia": req.materia,
            "materias": req.materias,
            "conteudos": req.conteudos,
            "distribuicao": req.distribuicao,
            "quantidade": req.quantidade,
            "adaptacoes": req.adaptacoes,
            "seed": req.seed,
        },
        "serie": prova.serie,
        "materias": prova.materias,
        "total": prova.total,
        "distribuicao_real": prova.distribuicao_real,
        "questoes": [
            {
                "ordem": q.ordem,
                "questao_id": q.questao_id,
                "enunciado": q.enunciado,
                "materia": q.materia,
                "conteudo": q.conteudo,
                "nivel": q.nivel,
                "alternativas": [
                    {"letra": a.letra, "texto": a.texto, "alternativa_id": a.alternativa_id}
                    for a in q.alternativas
                ],
            }
            for q in prova.questoes
        ],
        "gabarito": prova.gabarito_dict(),
    }
