from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import PerfilUsuario
from app.models import Simulado, Usuario
from app.services import auditoria_service
from app.services import simulado_service

from app.api.permissoes import admin_gestor

router = APIRouter(
    prefix="/simulados",
    tags=["simulados"],
    dependencies=[Depends(admin_gestor)],
)


class CriarSimuladoRequest(BaseModel):
    gestor_id: int
    turma_id: int
    titulo: str = Field(..., examples=["Simulado de Matemática - 9º ano"])
    serie: str = Field(..., examples=["9º ano"])
    materia: str = Field(..., examples=["Matemática"])
    conteudos: list[str] | None = None
    distribuicao: dict[str, float] | None = Field(
        None, examples=[{"Fácil": 0.3, "Médio": 0.5, "Difícil": 0.2}]
    )
    quantidade: int = Field(10, ge=1, le=100)
    adaptacoes: list[str] | None = None
    seed: int | None = None


class GerarRequest(BaseModel):
    seed: int | None = Field(None, description="Fixa o sorteio (reproduzível)")


class DefinirQuestoesRequest(BaseModel):
    questao_ids: list[int] = Field(..., min_length=1)


class InscreverAlunoRequest(BaseModel):
    aluno_id: int


def _resumo(simulado) -> dict:
    return {
        "id": simulado.id,
        "titulo": simulado.titulo,
        "status": simulado.status.value,
        "turma_id": simulado.turma_id,
        "gestor_id": simulado.gestor_id,
        "total_questoes": len(simulado.questoes),
        "parametros": simulado.parametros_json,
    }


def _inscricao_resumo(inscricao) -> dict:
    aluno = inscricao.aluno
    usuario = aluno.usuario if aluno else None
    return {
        "id": inscricao.id,
        "simulado_id": inscricao.simulado_id,
        "aluno_id": inscricao.aluno_id,
        "aluno_nome": usuario.nome if usuario else None,
        "status": inscricao.status,
        "inscrito_por_id": inscricao.inscrito_por_id,
        "inscrito_em": inscricao.inscrito_em.isoformat() if inscricao.inscrito_em else None,
    }


@router.post("")
def criar_simulado(
    req: CriarSimuladoRequest,
    request: Request,
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    if usuario.perfil == PerfilUsuario.GESTOR and req.gestor_id != usuario.id:
        raise HTTPException(status_code=403, detail="Gestor so pode criar prova para si.")
    parametros = {
        "serie": req.serie,
        "materia": req.materia,
        "conteudos": req.conteudos,
        "distribuicao": req.distribuicao,
        "quantidade": req.quantidade,
        "adaptacoes": req.adaptacoes,
        "seed": req.seed,
    }
    simulado = simulado_service.criar_simulado(
        sessao,
        gestor_id=req.gestor_id,
        turma_id=req.turma_id,
        titulo=req.titulo,
        parametros=parametros,
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="criar_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado.id,
        detalhes=f"Criou simulado {simulado.titulo}.",
        request=request,
    )
    sessao.commit()
    return _resumo(simulado)


@router.post("/{simulado_id}/gerar")
def gerar(
    simulado_id: int,
    req: GerarRequest,
    request: Request,
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        simulado = simulado_service.gerar_e_persistir(
            sessao, simulado_id=simulado_id, seed=req.seed
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="gerar_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado.id,
        detalhes=f"Gerou montagem de {simulado.titulo}.",
        request=request,
    )
    sessao.commit()
    return _resumo(simulado)


@router.post("/{simulado_id}/questoes")
def definir_questoes(
    simulado_id: int,
    req: DefinirQuestoesRequest,
    request: Request,
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        simulado = simulado_service.definir_questoes(
            sessao, simulado_id=simulado_id, questao_ids=req.questao_ids
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="montar_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado.id,
        detalhes=f"Associou {len(req.questao_ids)} questoes ao simulado {simulado.titulo}.",
        request=request,
    )
    sessao.commit()
    return _resumo(simulado)


@router.get("/{simulado_id}/preview")
def preview(simulado_id: int, sessao: Session = Depends(get_session)) -> dict:
    try:
        questoes = simulado_service.montar_questoes(
            sessao, simulado_id=simulado_id, incluir_gabarito=True
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"simulado_id": simulado_id, "questoes": questoes}


@router.get("/{simulado_id}/inscricoes")
def listar_inscricoes(simulado_id: int, sessao: Session = Depends(get_session)) -> dict:
    simulado = sessao.get(Simulado, simulado_id)
    if simulado is None:
        raise HTTPException(status_code=404, detail="Simulado nao encontrado.")
    dados = [_inscricao_resumo(i) for i in simulado.inscricoes if i.status == "inscrito"]
    return {"simulado_id": simulado_id, "dados": dados, "total": len(dados)}


@router.post("/{simulado_id}/inscricoes", status_code=201)
def inscrever_aluno(
    simulado_id: int,
    req: InscreverAlunoRequest,
    request: Request,
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        inscricao = simulado_service.inscrever_aluno(
            sessao,
            simulado_id=simulado_id,
            aluno_id=req.aluno_id,
            inscrito_por_id=usuario.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="inscrever_aluno_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado_id,
        detalhes=f"Inscreveu aluno #{req.aluno_id} no simulado #{simulado_id}.",
        request=request,
    )
    sessao.commit()
    return _inscricao_resumo(inscricao)


@router.post("/{simulado_id}/liberar")
def liberar(
    simulado_id: int,
    request: Request,
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        simulado = simulado_service.liberar(sessao, simulado_id=simulado_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="liberar_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado.id,
        detalhes=f"Liberou simulado {simulado.titulo}.",
        request=request,
    )
    sessao.commit()
    return _resumo(simulado)


@router.get("/{simulado_id}/questoes")
def questoes_do_aluno(
    simulado_id: int, sessao: Session = Depends(get_session)
) -> dict:
    try:
        questoes = simulado_service.montar_questoes(
            sessao, simulado_id=simulado_id, incluir_gabarito=False
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"simulado_id": simulado_id, "questoes": questoes}


@router.post("/{simulado_id}/finalizar")
def finalizar(
    simulado_id: int,
    request: Request,
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        resultado = simulado_service.finalizar_e_corrigir(sessao, simulado_id=simulado_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="finalizar_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado_id,
        detalhes=f"Finalizou simulado #{simulado_id} e gerou resultados.",
        request=request,
    )
    sessao.commit()
    return resultado


@router.get("/{simulado_id}/resultados/{aluno_id}")
def resultado_aluno(
    simulado_id: int,
    aluno_id: int,
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        return simulado_service.resultado_do_aluno(
            sessao, simulado_id=simulado_id, aluno_id=aluno_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{simulado_id}/questoes/{questao_id}")
def remover_questao(
    simulado_id: int,
    questao_id: int,
    request: Request,
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        simulado_service.remover_questao(
            sessao, simulado_id=simulado_id, questao_id=questao_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="editar_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado_id,
        detalhes=f"Removeu questao #{questao_id} do simulado #{simulado_id}.",
        request=request,
    )
    sessao.commit()
    questoes = simulado_service.montar_questoes(
        sessao, simulado_id=simulado_id, incluir_gabarito=True
    )
    return {"simulado_id": simulado_id, "questoes": questoes}


@router.post("/{simulado_id}/questoes/{questao_id}/trocar")
def trocar_questao(
    simulado_id: int,
    questao_id: int,
    request: Request,
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        simulado_service.trocar_questao(
            sessao, simulado_id=simulado_id, questao_id=questao_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="editar_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado_id,
        detalhes=f"Trocou questao #{questao_id} do simulado #{simulado_id}.",
        request=request,
    )
    sessao.commit()
    questoes = simulado_service.montar_questoes(
        sessao, simulado_id=simulado_id, incluir_gabarito=True
    )
    return {"simulado_id": simulado_id, "questoes": questoes}
