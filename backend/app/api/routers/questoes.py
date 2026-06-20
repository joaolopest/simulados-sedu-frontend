from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.api.permissoes import (
    aplicar_escopo_questoes,
    criadores_questao,
    escola_id_da_questao,
    exigir_dono_ou_gestor_questao,
    leitores_questao,
    usuario_pode_ver_questao,
    so_admin,
)
from app.enums import PerfilUsuario, StatusQuestao
from app.models import (
    Conteudo,
    Materia,
    Nivel,
    Notificacao,
    Questao,
    RevisaoQuestao,
    Serie,
    Usuario,
)
from app.services import auditoria_service
from app.services import questao_service

router = APIRouter(prefix="/questoes", tags=["questoes"])


class AlternativaIn(BaseModel):
    texto: str
    correta: bool = False


class CadastrarQuestaoRequest(BaseModel):
    enunciado: str = Field(..., examples=["Qual Ã© a raiz de 2x - 8 = 0?"])
    serie: str = Field(..., examples=["9Âº ano"])
    materia: str = Field(..., examples=["MatemÃ¡tica"])
    conteudo: str = Field(..., examples=["FunÃ§Ãµes"])
    nivel: str = Field(..., examples=["FÃ¡cil"])
    adaptacoes: list[str] = []
    competencias: list[str] = []
    explicacao: str | None = None
    tempo_estimado_segundos: int = 60
    status: str = "rascunho"
    imagem_url: str | None = None
    criado_por_id: int | None = None
    alternativas: list[AlternativaIn]


class AtualizarQuestaoRequest(BaseModel):
    enunciado: str | None = None
    serie: str | None = None
    materia: str | None = None
    conteudo: str | None = None
    nivel: str | None = None
    adaptacoes: list[str] | None = None
    competencias: list[str] | None = None
    explicacao: str | None = None
    tempo_estimado_segundos: int | None = None
    status: str | None = None
    imagem_url: str | None = None


def _status_enum(valor: str) -> StatusQuestao:
    try:
        return StatusQuestao(valor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"status invÃ¡lido: {valor}") from exc


def _serializar(questao: Questao) -> dict:
    return {
        "id": questao.id,
        "enunciado": questao.enunciado,
        "imagem_url": questao.imagem_url,
        "serie": questao.serie.nome,
        "materia": questao.materia.nome,
        "conteudo": questao.conteudo.nome,
        "nivel": questao.nivel.nome,
        "adaptacoes": questao.adaptacoes,
        "status": questao.status.value,
        "tempo_estimado_segundos": questao.tempo_estimado_segundos,
        "competencias": questao.competencias,
        "explicacao": questao.explicacao,
        "versao": questao.versao,
        "criado_por_id": questao.criado_por_id,
        "escola_id": questao.escola_id,
        "criada_em": questao.criada_em.isoformat() if questao.criada_em else None,
        "atualizada_em": (
            questao.atualizada_em.isoformat() if questao.atualizada_em else None
        ),
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


@router.get("", summary="Listar e filtrar questÃµes")
def listar_questoes(
    busca: str | None = Query(None),
    serie: list[str] | None = Query(None, description="Nomes de sÃ©rie (ex.: '9Âº ano')"),
    materia: list[str] | None = Query(None),
    nivel: list[str] | None = Query(None),
    status: list[str] | None = Query(None),
    adaptacao: list[str] | None = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=200),
    usuario: Usuario = Depends(leitores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    q = (
        sessao.query(Questao)
        .join(Serie, Questao.serie_id == Serie.id)
        .join(Materia, Questao.materia_id == Materia.id)
        .join(Nivel, Questao.nivel_id == Nivel.id)
    )
    q = aplicar_escopo_questoes(q, usuario)
    if busca:
        q = q.filter(Questao.enunciado.ilike(f"%{busca}%"))
    if serie:
        q = q.filter(Serie.nome.in_(serie))
    if materia:
        q = q.filter(Materia.nome.in_(materia))
    if nivel:
        q = q.filter(Nivel.nome.in_(nivel))
    if status:
        q = q.filter(Questao.status.in_([_status_enum(s) for s in status]))

    if adaptacao:
        # Filtro por adaptação vive em JSON — filtra em memória (caminho menos comum).
        itens = q.order_by(Questao.id).all()
        itens = [
            it for it in itens if any(a in (it.adaptacoes or []) for a in adaptacao)
        ]
        total = len(itens)
        inicio = (pagina - 1) * por_pagina
        pagina_itens = itens[inicio : inicio + por_pagina]
    else:
        # Caminho rápido: conta + pagina no banco (offset/limit) e carrega só a
        # página com eager-load das relações (sem N+1, sem trazer tudo).
        total = q.count()
        pagina_itens = (
            q.options(
                selectinload(Questao.serie),
                selectinload(Questao.materia),
                selectinload(Questao.conteudo),
                selectinload(Questao.nivel),
                selectinload(Questao.alternativas),
            )
            .order_by(Questao.id)
            .offset((pagina - 1) * por_pagina)
            .limit(por_pagina)
            .all()
        )

    return {
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "dados": [_serializar(x) for x in pagina_itens],
    }


def _serializar_revisao(revisao: RevisaoQuestao) -> dict:
    return {
        "id": revisao.id,
        "questao_id": revisao.questao_id,
        "solicitante_id": revisao.solicitante_id,
        "escola_id": revisao.escola_id,
        "tipo": revisao.tipo,
        "motivo": revisao.motivo,
        "status": revisao.status,
        "resposta": revisao.resposta,
        "resolvido_por_id": revisao.resolvido_por_id,
        "criado_em": revisao.criado_em.isoformat() if revisao.criado_em else None,
        "resolvido_em": (
            revisao.resolvido_em.isoformat() if revisao.resolvido_em else None
        ),
        "questao": _serializar(revisao.questao) if revisao.questao else None,
    }


class ResolverRevisaoRequest(BaseModel):
    status: str = Field(..., examples=["aprovada"])
    resposta: str | None = None


@router.get("/revisoes", dependencies=[Depends(so_admin)])
def listar_revisoes(
    status: str | None = Query("pendente"),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(RevisaoQuestao).order_by(RevisaoQuestao.criado_em.desc())
    if status:
        q = q.filter(RevisaoQuestao.status == status)
    dados = [_serializar_revisao(r) for r in q.all()]
    return {"dados": dados, "total": len(dados)}


@router.patch("/revisoes/{revisao_id}", dependencies=[Depends(so_admin)])
def resolver_revisao(
    revisao_id: int,
    req: ResolverRevisaoRequest,
    request: Request,
    usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    revisao = sessao.get(RevisaoQuestao, revisao_id)
    if revisao is None:
        raise HTTPException(status_code=404, detail="RevisÃ£o nÃ£o encontrada.")
    if req.status not in ("aprovada", "rejeitada"):
        raise HTTPException(status_code=422, detail="Status deve ser aprovada ou rejeitada.")

    revisao.status = req.status
    revisao.resposta = req.resposta
    revisao.resolvido_por_id = usuario.id
    revisao.resolvido_em = datetime.now(timezone.utc)

    if req.status == "aprovada" and revisao.tipo == "exclusao" and revisao.questao:
        revisao.questao.status = StatusQuestao.ARQUIVADA
        revisao.questao.atualizada_em = datetime.now(timezone.utc)

    sessao.add(
        Notificacao(
            tipo="revisao_questao",
            titulo=f"RevisÃ£o {req.status}",
            mensagem=req.resposta or f"Sua solicitaÃ§Ã£o foi {req.status}.",
            destinatario_id=revisao.solicitante_id,
            origem_id=str(revisao.questao_id),
            origem_tipo="questao",
            acao_url=f"/professor/questoes",
            acao_label="Ver questÃµes",
        )
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="resolucao_revisao",
        alvo_tipo="revisao_questao",
        alvo_id=revisao.id,
        detalhes=f"Revisao {req.status}: {req.resposta or ''}".strip(),
        request=request,
    )
    sessao.commit()
    sessao.refresh(revisao)
    return _serializar_revisao(revisao)


@router.get("/{questao_id}")
def detalhar_questao(
    questao_id: int,
    usuario: Usuario = Depends(leitores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="QuestÃ£o nÃ£o encontrada.")
    if not usuario_pode_ver_questao(sessao, usuario, questao):
        raise HTTPException(status_code=403, detail="QuestÃ£o fora do seu escopo.")
    return _serializar(questao)


@router.post("", status_code=201, summary="Cadastrar questÃ£o")
def cadastrar_questao(
    req: CadastrarQuestaoRequest,
    request: Request,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
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
            imagem_url=req.imagem_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Campos de fidelidade que o service nÃ£o cobre.
    if usuario.perfil == PerfilUsuario.ADMIN:
        questao.status = _status_enum(req.status)
    elif usuario.perfil == PerfilUsuario.GESTOR:
        questao.status = _status_enum(req.status)
    else:
        questao.status = StatusQuestao.RASCUNHO
    questao.tempo_estimado_segundos = req.tempo_estimado_segundos
    questao.competencias = req.competencias
    questao.explicacao = req.explicacao
    questao.criado_por_id = usuario.id  # dono = quem criou (ignora criado_por_id do body)
    questao.escola_id = None if usuario.perfil == PerfilUsuario.ADMIN else usuario.escola_id
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="criar_questao",
        alvo_tipo="questao",
        alvo_id=questao.id,
        detalhes=f"Cadastrou questao de {questao.materia.nome} ({questao.nivel.nome})",
        request=request,
    )
    sessao.commit()
    sessao.refresh(questao)
    return _serializar(questao)


@router.patch("/{questao_id}")
def atualizar_questao(
    questao_id: int,
    req: AtualizarQuestaoRequest,
    request: Request,
    usuario: Usuario = Depends(exigir_dono_ou_gestor_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="QuestÃ£o nÃ£o encontrada.")

    if req.enunciado is not None:
        questao.enunciado = req.enunciado
    if req.serie is not None:
        serie = sessao.scalar(select(Serie).where(Serie.nome == req.serie))
        if serie is None:
            raise HTTPException(status_code=422, detail=f"sÃ©rie inexistente: {req.serie}")
        questao.serie = serie
    if req.materia is not None:
        materia = sessao.scalar(select(Materia).where(Materia.nome == req.materia))
        if materia is None:
            raise HTTPException(status_code=422, detail=f"matÃ©ria inexistente: {req.materia}")
        questao.materia = materia
    if req.nivel is not None:
        nivel = sessao.scalar(select(Nivel).where(Nivel.nome == req.nivel))
        if nivel is None:
            raise HTTPException(status_code=422, detail=f"nÃ­vel inexistente: {req.nivel}")
        questao.nivel = nivel
    if req.conteudo is not None:
        cont = sessao.scalar(
            select(Conteudo).where(
                Conteudo.nome == req.conteudo,
                Conteudo.materia_id == questao.materia_id,
            )
        )
        if cont is None:
            cont = Conteudo(nome=req.conteudo, materia_id=questao.materia_id)
            sessao.add(cont)
            sessao.flush()
        questao.conteudo = cont
    if req.adaptacoes is not None:
        questao.adaptacoes = req.adaptacoes
    if req.competencias is not None:
        questao.competencias = req.competencias
    if req.explicacao is not None:
        questao.explicacao = req.explicacao
    if req.tempo_estimado_segundos is not None:
        questao.tempo_estimado_segundos = req.tempo_estimado_segundos
    if req.status is not None:
        # professor nÃ£o publica â€” sÃ³ admin/gestor podem marcar 'publicada'.
        if req.status == "publicada" and usuario.perfil not in (
            PerfilUsuario.ADMIN,
            PerfilUsuario.GESTOR,
        ):
            raise HTTPException(
                status_code=403, detail="Apenas admin/gestor publicam questÃµes."
            )
        questao.status = _status_enum(req.status)
    if req.imagem_url is not None:
        questao.imagem_url = req.imagem_url

    questao.versao = (questao.versao or 1) + 1
    questao.atualizada_em = datetime.now(timezone.utc)
    tipo_auditoria = "publicar_questao" if req.status == "publicada" else "editar_questao"
    detalhes = (
        f"Alterou status para {req.status}"
        if req.status is not None
        else f"Editou questao de {questao.materia.nome}"
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo=tipo_auditoria,
        alvo_tipo="questao",
        alvo_id=questao.id,
        detalhes=detalhes,
        request=request,
    )
    sessao.commit()
    sessao.refresh(questao)
    return _serializar(questao)


@router.delete("/{questao_id}")
def remover_questao(
    questao_id: int,
    request: Request,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="QuestÃ£o nÃ£o encontrada.")

    if usuario.perfil == PerfilUsuario.ADMIN:
        try:
            sessao.delete(questao)
            auditoria_service.registrar(
                sessao,
                usuario=usuario,
                tipo="remover_questao",
                alvo_tipo="questao",
                alvo_id=questao_id,
                detalhes=f"Removeu fisicamente a questao #{questao_id}",
                request=request,
            )
            sessao.commit()
            return {"id": questao_id, "removida": True, "arquivada": False}
        except IntegrityError:
            sessao.rollback()
            questao = sessao.get(Questao, questao_id)
            if questao is None:
                return {"id": questao_id, "removida": True, "arquivada": False}
            questao.status = StatusQuestao.ARQUIVADA
            questao.atualizada_em = datetime.now(timezone.utc)
            auditoria_service.registrar(
                sessao,
                usuario=usuario,
                tipo="arquivar_questao",
                alvo_tipo="questao",
                alvo_id=questao_id,
                detalhes=f"Arquivou questao #{questao_id} porque ela ja estava em uso",
                request=request,
            )
            sessao.commit()
            return {"id": questao_id, "removida": False, "arquivada": True}

    if usuario.perfil == PerfilUsuario.GESTOR:
        escola_id = escola_id_da_questao(sessao, questao)
        if escola_id != usuario.escola_id and questao.criado_por_id != usuario.id:
            raise HTTPException(
                status_code=403,
                detail="Gestor sÃ³ pode arquivar questÃµes da prÃ³pria escola.",
            )
    elif questao.criado_por_id != usuario.id:
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "SOLICITE_REVISAO",
                "mensagem": "Solicite revisÃ£o para arquivar questÃ£o de outro autor.",
            },
        )

    questao.status = StatusQuestao.ARQUIVADA
    questao.atualizada_em = datetime.now(timezone.utc)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="arquivar_questao",
        alvo_tipo="questao",
        alvo_id=questao_id,
        detalhes=f"Arquivou questao #{questao_id}",
        request=request,
    )
    sessao.commit()
    return {"id": questao_id, "removida": False, "arquivada": True}


class SolicitarRevisaoRequest(BaseModel):
    tipo: str = "edicao"  # "exclusao" | "edicao"
    motivo: str | None = None


@router.post("/{questao_id}/solicitar-revisao", status_code=201)
def solicitar_revisao_questao(
    questao_id: int,
    req: SolicitarRevisaoRequest,
    request: Request,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    """Professor/gestor pedem revisÃ£o (excluir ou editar questÃ£o alheia).

    NÃ£o altera a questÃ£o: apenas notifica os admins e registra auditoria.
    """
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="QuestÃ£o nÃ£o encontrada.")
    if not usuario_pode_ver_questao(sessao, usuario, questao):
        raise HTTPException(status_code=403, detail="QuestÃ£o fora do seu escopo.")
    tipo = "exclusao" if req.tipo == "exclusao" else "edicao"
    escola_id = escola_id_da_questao(sessao, questao)
    existente = sessao.scalar(
        select(RevisaoQuestao).where(
            RevisaoQuestao.questao_id == questao_id,
            RevisaoQuestao.solicitante_id == usuario.id,
            RevisaoQuestao.tipo == tipo,
            RevisaoQuestao.status == "pendente",
        )
    )
    if existente is not None:
        return {"ok": True, "id": existente.id, "tipo": tipo, "status": existente.status, "notificados": 0}

    revisao = RevisaoQuestao(
        questao_id=questao_id,
        solicitante_id=usuario.id,
        escola_id=escola_id,
        tipo=tipo,
        motivo=req.motivo,
        status="pendente",
    )
    sessao.add(revisao)
    sessao.flush()
    rotulo = "exclusÃ£o" if tipo == "exclusao" else "ediÃ§Ã£o"
    resumo = (questao.enunciado or "")[:60]
    msg = f"{usuario.nome} solicitou {rotulo} da questÃ£o #{questao_id} ({resumo}â€¦)."
    if req.motivo:
        msg += f" Motivo: {req.motivo}"
    destinatarios = sessao.scalars(
        select(Usuario).where(
            Usuario.ativo.is_(True),
            (
                (Usuario.perfil == PerfilUsuario.ADMIN)
                | (
                    (Usuario.perfil == PerfilUsuario.GESTOR)
                    & (Usuario.escola_id == escola_id)
                )
            ),
        )
    ).all()
    vistos: set[int] = set()
    for adm in destinatarios:
        if adm.id == usuario.id or adm.id in vistos:
            continue
        vistos.add(adm.id)
        sessao.add(
            Notificacao(
                tipo="revisao_questao",
                titulo=f"RevisÃ£o solicitada: {rotulo} de questÃ£o",
                mensagem=msg,
                destinatario_id=adm.id,
                origem_id=str(questao_id),
                origem_tipo="questao",
                acao_url=f"/admin/questoes/{questao_id}",
                acao_label="Ver questÃ£o",
            )
        )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="solicitacao_revisao",
        alvo_tipo="questao",
        alvo_id=questao_id,
        detalhes=f"{msg} Revisao #{revisao.id}.",
        request=request,
    )
    sessao.commit()
    return {
        "ok": True,
        "id": revisao.id,
        "tipo": tipo,
        "status": revisao.status,
        "notificados": len(vistos),
    }
