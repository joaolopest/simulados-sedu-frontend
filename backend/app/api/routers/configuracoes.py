from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.api.permissoes import autenticado, so_admin
from app.models import ConfiguracaoSistema, Usuario
from app.services import auditoria_service, configuracao_service

router = APIRouter(prefix="/configuracoes", tags=["configuracoes"])


class AtualizarConfiguracaoRequest(BaseModel):
    valor: dict = Field(default_factory=dict)


def _serializar(config: ConfiguracaoSistema, sessao: Session) -> dict:
    return {
        "id": str(config.id),
        "chave": config.chave,
        "valor": configuracao_service.obter_valor(sessao, config.chave),
        "descricao": config.descricao,
        "atualizadoPorId": (
            str(config.atualizado_por_id) if config.atualizado_por_id else None
        ),
        "criadoEm": config.criado_em.isoformat() if config.criado_em else None,
        "atualizadoEm": config.atualizado_em.isoformat() if config.atualizado_em else None,
    }


@router.get("")
def listar_configuracoes(
    _usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    configs = configuracao_service.listar(sessao)
    sessao.commit()
    return {"dados": [_serializar(config, sessao) for config in configs]}


@router.get("/{chave}")
def obter_configuracao(
    chave: str,
    _usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    config = next(
        (item for item in configuracao_service.listar(sessao) if item.chave == chave),
        None,
    )
    sessao.commit()
    if config is None:
        raise HTTPException(
            status_code=404,
            detail="Configura\u00e7\u00e3o n\u00e3o encontrada.",
        )
    return _serializar(config, sessao)


@router.patch("/{chave}", dependencies=[Depends(so_admin)])
def atualizar_configuracao(
    chave: str,
    req: AtualizarConfiguracaoRequest,
    request: Request,
    usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        config = configuracao_service.atualizar(
            sessao,
            chave=chave,
            valor=req.valor,
            usuario=usuario,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="atualizar_configuracao",
        alvo_tipo="configuracao",
        alvo_id=config.chave,
        detalhes=f"Atualizou configura\u00e7\u00e3o {config.chave}.",
        request=request,
    )
    sessao.commit()
    sessao.refresh(config)
    return _serializar(config, sessao)
