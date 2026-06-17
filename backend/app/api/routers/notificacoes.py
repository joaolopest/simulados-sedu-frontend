"""Notificações do usuário autenticado.

    GET   /notificacoes            lista as do próprio usuário (+ contagem não lidas)
    PATCH /notificacoes/{id}       marca como lida/não lida
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.api.permissoes import autenticado
from app.models import Notificacao, Usuario

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
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    itens = sessao.scalars(
        select(Notificacao)
        .where(Notificacao.destinatario_id == usuario.id)
        .order_by(Notificacao.criada_em.desc())
    ).all()
    nao_lidas = sum(1 for n in itens if not n.lida)
    return {
        "total": len(itens),
        "nao_lidas": nao_lidas,
        "dados": [_serializar(n) for n in itens],
    }


class MarcarLidaRequest(BaseModel):
    lida: bool | None = None


@router.patch("/{notificacao_id}")
def marcar_notificacao(
    notificacao_id: int,
    req: MarcarLidaRequest,
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
    sessao.commit()
    sessao.refresh(notif)
    return _serializar(notif)
