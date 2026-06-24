"""Trilha de auditoria.

    GET  /auditoria      lista (admin) — filtros tipo[], usuario_id; paginação
    POST /auditoria      registra uma ação (ator = usuário autenticado do token)

O ator é sempre o usuário do token — o cliente não escolhe quem fez a ação.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.api.permissoes import autenticado, so_admin
from app.models import AcaoAuditoria, Usuario
from app.services import auditoria_service

router = APIRouter(prefix="/auditoria", tags=["auditoria"])


def _serializar(a: AcaoAuditoria, usuarios: dict[int, Usuario]) -> dict:
    u = usuarios.get(a.usuario_id) if a.usuario_id else None
    return {
        "id": a.id,
        "tipo": a.tipo,
        "usuario_id": a.usuario_id,
        "usuario_nome": a.usuario_nome,
        "alvo_tipo": a.alvo_tipo,
        "alvo_id": a.alvo_id,
        "detalhes": a.detalhes,
        "ip_origem": a.ip_origem,
        "ocorrido_em": a.ocorrido_em.isoformat() if a.ocorrido_em else None,
        "usuario": (
            {
                "id": a.usuario_id,
                "nome": a.usuario_nome,
                "foto_url": u.foto_url if u else None,
            }
            if a.usuario_id
            else None
        ),
    }


@router.get("", dependencies=[Depends(so_admin)])
def listar_auditoria(
    tipo: list[str] | None = Query(None),
    usuario_id: int | None = Query(None),
    alvo_tipo: str | None = Query(None),
    alvo_id: str | None = Query(None),
    busca: str | None = Query(None),
    desde: datetime | None = Query(None),
    ate: datetime | None = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(30, ge=1, le=200),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(AcaoAuditoria)
    if tipo:
        q = q.filter(AcaoAuditoria.tipo.in_(tipo))
    if usuario_id:
        q = q.filter(AcaoAuditoria.usuario_id == usuario_id)
    if alvo_tipo:
        q = q.filter(AcaoAuditoria.alvo_tipo == alvo_tipo)
    if alvo_id:
        q = q.filter(AcaoAuditoria.alvo_id == alvo_id)
    if desde:
        q = q.filter(AcaoAuditoria.ocorrido_em >= desde)
    if ate:
        q = q.filter(AcaoAuditoria.ocorrido_em <= ate)
    if busca:
        termo = f"%{busca.strip()}%"
        q = q.filter(
            or_(
                AcaoAuditoria.tipo.ilike(termo),
                AcaoAuditoria.usuario_nome.ilike(termo),
                AcaoAuditoria.detalhes.ilike(termo),
                AcaoAuditoria.alvo_tipo.ilike(termo),
                AcaoAuditoria.alvo_id.ilike(termo),
            )
        )
    total = q.count()
    itens = (
        q.order_by(AcaoAuditoria.ocorrido_em.desc())
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
        .all()
    )
    ids = {a.usuario_id for a in itens if a.usuario_id}
    usuarios = (
        {u.id: u for u in sessao.scalars(select(Usuario).where(Usuario.id.in_(ids))).all()}
        if ids
        else {}
    )
    return {
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "dados": [_serializar(a, usuarios) for a in itens],
    }


class RegistrarRequest(BaseModel):
    tipo: str
    alvo_tipo: str | None = None
    alvo_id: str | None = None
    detalhes: str | None = None


@router.post("", status_code=201)
def registrar_acao(
    req: RegistrarRequest,
    request: Request,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    acao = auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo=req.tipo,
        alvo_tipo=req.alvo_tipo,
        alvo_id=req.alvo_id,
        detalhes=req.detalhes,
        request=request,
    )
    sessao.commit()
    sessao.refresh(acao)
    return _serializar(acao, {usuario.id: usuario})
