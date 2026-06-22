"""Notificações do usuário autenticado.

    GET   /notificacoes            lista as do próprio usuário (+ contagem não lidas)
    PATCH /notificacoes/{id}       marca como lida/não lida
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.api.permissoes import autenticado
from app.models import Notificacao, Usuario
from app.services import auditoria_service

router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])


def _serializar(n: Notificacao) -> dict:
    return {
        "id": n.id,
        "tipo": n.tipo,
        "titulo": n.titulo,
        "mensagem": n.mensagem,
        "destinatario_id": n.destinatario_id,
        "origem_id": n.origem_id,
        "origem_tipo": n.origem_tipo,
        "lida": n.lida,
        "acao_url": n.acao_url,
        "acao_label": n.acao_label,
        "criada_em": n.criada_em.isoformat() if n.criada_em else None,
        "lida_em": n.lida_em.isoformat() if n.lida_em else None,
    }


@router.get("")
def listar_notificacoes(
    lida: bool | None = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(100, ge=1, le=200),
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(Notificacao).where(Notificacao.destinatario_id == usuario.id)
    if lida is not None:
        q = q.where(Notificacao.lida.is_(lida))
    total = q.count()
    nao_lidas = (
        sessao.query(Notificacao)
        .where(
            Notificacao.destinatario_id == usuario.id,
            Notificacao.lida.is_(False),
        )
        .count()
    )
    itens = (
        q.order_by(Notificacao.criada_em.desc(), Notificacao.id.desc())
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
        .all()
    )
    return {
        "total": total,
        "nao_lidas": nao_lidas,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "dados": [_serializar(n) for n in itens],
    }


class MarcarLidaRequest(BaseModel):
    lida: bool | None = None


@router.patch("/{notificacao_id}")
def marcar_notificacao(
    notificacao_id: int,
    req: MarcarLidaRequest,
    request: Request,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    notif = sessao.get(Notificacao, notificacao_id)
    # 404 também se for de outro usuário (não vaza existência).
    if notif is None or notif.destinatario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")
    novo_estado = req.lida if req.lida is not None else True
    notif.lida = novo_estado
    notif.lida_em = datetime.now(timezone.utc) if novo_estado else None
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="marcar_notificacao_lida" if novo_estado else "marcar_notificacao_nao_lida",
        alvo_tipo="notificacao",
        alvo_id=notif.id,
        detalhes=f"Marcou notificacao #{notif.id} como {'lida' if novo_estado else 'nao lida'}.",
        request=request,
    )
    sessao.commit()
    sessao.refresh(notif)
    return _serializar(notif)


@router.patch("")
def marcar_notificacoes_em_lote(
    req: MarcarLidaRequest,
    request: Request,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    novo_estado = req.lida if req.lida is not None else True
    itens = sessao.scalars(
        select(Notificacao).where(
            Notificacao.destinatario_id == usuario.id,
            Notificacao.lida.is_(not novo_estado),
        )
    ).all()
    agora = datetime.now(timezone.utc)
    for notif in itens:
        notif.lida = novo_estado
        notif.lida_em = agora if novo_estado else None
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="marcar_todas_notificacoes_lidas"
        if novo_estado
        else "marcar_todas_notificacoes_nao_lidas",
        alvo_tipo="notificacao",
        alvo_id=None,
        detalhes=f"Atualizou {len(itens)} notificacoes para {'lidas' if novo_estado else 'nao lidas'}.",
        request=request,
    )
    sessao.commit()
    return {"ok": True, "totalAtualizadas": len(itens), "lida": novo_estado}
