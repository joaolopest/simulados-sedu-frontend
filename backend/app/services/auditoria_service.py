from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AcaoAuditoria, Usuario


def ip_da_requisicao(request: Request | None) -> str | None:
    if request is None:
        return None
    encaminhado = request.headers.get("x-forwarded-for")
    if encaminhado:
        return encaminhado.split(",", 1)[0].strip()[:45]
    return request.client.host[:45] if request.client else None


def registrar(
    sessao: Session,
    *,
    usuario: Usuario | None,
    tipo: str,
    alvo_tipo: str | None = None,
    alvo_id: str | int | None = None,
    detalhes: str | None = None,
    request: Request | None = None,
) -> AcaoAuditoria:
    acao = AcaoAuditoria(
        tipo=tipo,
        usuario_id=usuario.id if usuario else None,
        usuario_nome=usuario.nome if usuario else "Sistema",
        alvo_tipo=alvo_tipo,
        alvo_id=str(alvo_id) if alvo_id is not None else None,
        detalhes=detalhes,
        ip_origem=ip_da_requisicao(request),
    )
    sessao.add(acao)
    return acao
