from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models import Usuario
from app.services import auditoria_service, importacao_service

from app.api.permissoes import so_admin

router = APIRouter(
    prefix="/questoes",
    tags=["importacao"],
    dependencies=[Depends(so_admin)],
)


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


@router.post("/import", summary="Importar questões em lote (JSON da SEDUC)")
def importar_questoes(
    req: ImportarQuestoesRequest,
    request: Request,
    usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        relatorio = importacao_service.importar_questoes(
            sessao, {"questoes": req.questoes}
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="importacao",
        alvo_tipo="questao",
        detalhes=(
            f"Importou questoes: {relatorio.importadas} aceitas, "
            f"{relatorio.rejeitadas} rejeitadas."
        ),
        request=request,
    )
    sessao.commit()

    return {
        "importadas": relatorio.importadas,
        "rejeitadas": relatorio.rejeitadas,
        "erros": [{"linha": e.linha, "motivo": e.motivo} for e in relatorio.erros],
    }


@router.post("/import/validar", summary="Validar lote de questões sem gravar")
def validar_importacao_questoes(
    req: ImportarQuestoesRequest,
    _usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        relatorio = importacao_service.validar_questoes(
            sessao, {"questoes": req.questoes}
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "valido": relatorio.rejeitadas == 0,
        "validas": relatorio.importadas,
        "rejeitadas": relatorio.rejeitadas,
        "erros": [{"linha": e.linha, "motivo": e.motivo} for e in relatorio.erros],
    }
