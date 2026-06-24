from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_session, obter_usuario_atual
from app.repositories import etiqueta_repository

router = APIRouter(
    prefix="/etiquetas",
    tags=["etiquetas"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("/series", summary="Listar séries")
def listar_series(sessao: Session = Depends(get_session)) -> list[dict]:
    return [{"id": s.id, "nome": s.nome} for s in etiqueta_repository.listar_series(sessao)]


@router.get("/materias", summary="Listar matérias")
def listar_materias(sessao: Session = Depends(get_session)) -> list[dict]:
    return [
        {"id": m.id, "nome": m.nome} for m in etiqueta_repository.listar_materias(sessao)
    ]


@router.get("/niveis", summary="Listar níveis de dificuldade")
def listar_niveis(sessao: Session = Depends(get_session)) -> list[dict]:
    return [{"id": n.id, "nome": n.nome} for n in etiqueta_repository.listar_niveis(sessao)]


@router.get("/conteudos", summary="Listar conteúdos (filtra por matéria opcional)")
def listar_conteudos(
    materia: str | None = None,
    sessao: Session = Depends(get_session),
) -> list[dict]:
    return [
        {"id": c.id, "nome": c.nome, "materia": c.materia.nome}
        for c in etiqueta_repository.listar_conteudos(sessao, materia=materia)
    ]
