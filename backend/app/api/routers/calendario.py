"""Endpoint do CALENDÁRIO LETIVO + visão do admin sobre etapas.

    GET  /calendario             admin: provas futuras, passadas e itens letivos
    POST /calendario/itens       admin: cadastra item (feriado/recesso/etc.)
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import StatusEtapa, TipoItemCalendarioLetivo
from app.models import Etapa, ItemCalendarioLetivo

router = APIRouter(prefix="/calendario", tags=["calendario"])


class ItemCalendarioRequest(BaseModel):
    titulo: str
    descricao: str | None = None
    data: date
    tipo: TipoItemCalendarioLetivo
    escola_id: int | None = None


def _serializar_etapa(e: Etapa) -> dict:
    return {
        "id": e.id,
        "nome": e.nome,
        "tipo": e.tipo.value,
        "publico_alvo": e.publico_alvo.value,
        "data": e.data.isoformat(),
        "hora": e.hora.isoformat(timespec="minutes"),
        "local": e.local,
        "status": e.status.value,
    }


def _serializar_item(i: ItemCalendarioLetivo) -> dict:
    return {
        "id": i.id,
        "titulo": i.titulo,
        "descricao": i.descricao,
        "data": i.data.isoformat(),
        "tipo": i.tipo.value,
        "escola_id": i.escola_id,
    }


@router.get("")
def calendario(
    inicio: date | None = Query(None),
    fim: date | None = Query(None),
    escola_id: int | None = Query(None),
    sessao: Session = Depends(get_session),
) -> dict:
    q_etapas = sessao.query(Etapa)
    if inicio:
        q_etapas = q_etapas.filter(Etapa.data >= inicio)
    if fim:
        q_etapas = q_etapas.filter(Etapa.data <= fim)
    if escola_id:
        q_etapas = q_etapas.filter(Etapa.escola_id == escola_id)
    etapas = q_etapas.all()

    q_itens = sessao.query(ItemCalendarioLetivo)
    if inicio:
        q_itens = q_itens.filter(ItemCalendarioLetivo.data >= inicio)
    if fim:
        q_itens = q_itens.filter(ItemCalendarioLetivo.data <= fim)
    if escola_id:
        q_itens = q_itens.filter(
            (ItemCalendarioLetivo.escola_id.is_(None))
            | (ItemCalendarioLetivo.escola_id == escola_id),
        )
    itens = q_itens.all()

    futuras = [e for e in etapas if e.status in (StatusEtapa.AGENDADA, StatusEtapa.RASCUNHO)]
    passadas = [e for e in etapas if e.status is StatusEtapa.REALIZADA]

    return {
        "etapas_futuras": [_serializar_etapa(e) for e in futuras],
        "etapas_passadas": [_serializar_etapa(e) for e in passadas],
        "eventos_letivos": [_serializar_item(i) for i in itens],
    }


@router.post("/itens", status_code=201)
def criar_item(req: ItemCalendarioRequest, sessao: Session = Depends(get_session)) -> dict:
    item = ItemCalendarioLetivo(
        titulo=req.titulo,
        descricao=req.descricao,
        data=req.data,
        tipo=req.tipo,
        escola_id=req.escola_id,
    )
    sessao.add(item)
    sessao.commit()
    sessao.refresh(item)
    return _serializar_item(item)
