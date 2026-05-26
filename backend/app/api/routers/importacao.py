"""Endpoint de IMPORTAÇÃO de questões: POST /questoes/import (Épico 3 — T-01).

Recebe o JSON da SEDUC e devolve o relatório de importação.
A validação é feita questão a questão (ver app/services/importacao_service.py),
então um item inválido NÃO derruba o lote inteiro.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.services import importacao_service

router = APIRouter(prefix="/questoes", tags=["importacao"])


class ImportarQuestoesRequest(BaseModel):
    questoes: list[dict] = Field(
        ...,
        description="Lista de questões (cabeçalho + etiquetas + alternativas)",
        examples=[
            [
                {
                    "enunciado": "Qual é a raiz de 2x - 8 = 0?",
                    "imagem_url": None,
                    "etiquetas": {
                        "serie": "9º ano",
                        "materia": "Matemática",
                        "conteudo": "Funções",
                        "nivel": "Médio",
                    },
                    "adaptacoes": ["tdah"],
                    "alternativas": [
                        {"texto": "x = 2", "correta": False, "ordem_original": 1},
                        {"texto": "x = 4", "correta": True, "ordem_original": 2},
                        {"texto": "x = 6", "correta": False, "ordem_original": 3},
                        {"texto": "x = 8", "correta": False, "ordem_original": 4},
                    ],
                }
            ]
        ],
    )


@router.post("/import")
def importar_questoes(
    req: ImportarQuestoesRequest,
    sessao: Session = Depends(get_session),
) -> dict:
    """Importa um lote de questões em JSON e retorna o relatório."""
    try:
        relatorio = importacao_service.importar_questoes(
            sessao, {"questoes": req.questoes}
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "importadas": relatorio.importadas,
        "rejeitadas": relatorio.rejeitadas,
        "erros": [{"linha": e.linha, "motivo": e.motivo} for e in relatorio.erros],
    }
