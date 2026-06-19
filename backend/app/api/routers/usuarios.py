"""Endpoints de usuários administrados pelo perfil admin."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.api.permissoes import so_admin
from app.enums import PerfilUsuario
from app.models import Aluno, Escola, Turma, Usuario
from app.services import auditoria_service
from app.services import auth_service

router = APIRouter(
    prefix="/usuarios",
    tags=["usuarios"],
    dependencies=[Depends(so_admin)],
)

SENHA_PADRAO = "sedu123"


def _serializar_usuario(u: Usuario) -> dict:
    """Shape consumido pelo BFF do frontend."""
    escola = u.escola
    dados: dict = {
        "id": u.id,
        "nome": u.nome,
        "email": u.email,
        "perfil": u.perfil.value,
        "ativo": u.ativo,
        "criado_em": u.criado_em.isoformat() if u.criado_em else None,
        "atualizado_em": u.atualizado_em.isoformat() if u.atualizado_em else None,
        "escola_id": u.escola_id,
        "escola_nome": escola.nome if escola else None,
    }

    aluno = u.aluno
    if aluno is not None:
        turma = aluno.turma
        escola_aluno = turma.escola if turma else None
        dados["escola_id"] = escola_aluno.id if escola_aluno else u.escola_id
        dados["escola_nome"] = escola_aluno.nome if escola_aluno else dados["escola_nome"]
        dados["turma_id"] = aluno.turma_id
        dados["adaptacoes"] = aluno.perfil_cognitivo or []

    return dados


class UsuarioCriar(BaseModel):
    nome: str
    email: str
    perfil: PerfilUsuario
    senha: str | None = None
    ativo: bool = True
    escola_id: int | None = None


class UsuarioAtualizar(BaseModel):
    nome: str | None = None
    email: str | None = None
    perfil: PerfilUsuario | None = None
    senha: str | None = None
    ativo: bool | None = None
    escola_id: int | None = None


@router.get("")
def listar_usuarios(
    busca: str | None = Query(None, description="Busca por nome ou e-mail"),
    perfil: list[PerfilUsuario] | None = Query(None),
    ativo: bool | None = Query(None),
    escola_id: int | None = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(30, ge=1, le=200),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(Usuario)
    if busca:
        termo = f"%{busca}%"
        q = q.filter(or_(Usuario.nome.ilike(termo), Usuario.email.ilike(termo)))
    if perfil:
        q = q.filter(Usuario.perfil.in_(perfil))
    if ativo is not None:
        q = q.filter(Usuario.ativo == ativo)
    if escola_id is not None:
        q = q.filter(Usuario.escola_id == escola_id)

    total = q.count()
    itens = (
        q.options(
            selectinload(Usuario.escola),
            selectinload(Usuario.aluno)
            .selectinload(Aluno.turma)
            .selectinload(Turma.escola),
        )
        .order_by(Usuario.nome)
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
        .all()
    )
    return {
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "dados": [_serializar_usuario(u) for u in itens],
    }


@router.get("/{usuario_id}")
def detalhar_usuario(usuario_id: int, sessao: Session = Depends(get_session)) -> dict:
    usuario = sessao.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return _serializar_usuario(usuario)


@router.post("", status_code=201)
def criar_usuario(
    req: UsuarioCriar,
    request: Request,
    usuario_logado: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    ja_existe = sessao.scalar(select(Usuario).where(Usuario.email == req.email))
    if ja_existe is not None:
        raise HTTPException(status_code=409, detail="Já existe um usuário com este email.")
    if req.escola_id is not None and sessao.get(Escola, req.escola_id) is None:
        raise HTTPException(status_code=404, detail="Escola não encontrada.")

    usuario = Usuario(
        nome=req.nome,
        email=req.email,
        perfil=req.perfil,
        ativo=req.ativo,
        escola_id=req.escola_id,
        senha_hash=auth_service.gerar_hash_senha(req.senha or SENHA_PADRAO),
    )
    sessao.add(usuario)
    sessao.flush()
    auditoria_service.registrar(
        sessao,
        usuario=usuario_logado,
        tipo="criar_usuario",
        alvo_tipo="usuario",
        alvo_id=usuario.id,
        detalhes=f"Cadastrou {usuario.nome} ({usuario.perfil.value}) - {usuario.email}",
        request=request,
    )
    sessao.commit()
    sessao.refresh(usuario)
    return _serializar_usuario(usuario)


@router.patch("/{usuario_id}")
def atualizar_usuario(
    usuario_id: int,
    req: UsuarioAtualizar,
    request: Request,
    usuario_logado: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    usuario = sessao.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if req.email is not None and req.email != usuario.email:
        dup = sessao.scalar(
            select(Usuario).where(Usuario.email == req.email, Usuario.id != usuario_id)
        )
        if dup is not None:
            raise HTTPException(
                status_code=409, detail="Já existe outro usuário com este email."
            )
        usuario.email = req.email
    if req.nome is not None:
        usuario.nome = req.nome
    if req.perfil is not None:
        usuario.perfil = req.perfil
    if req.ativo is not None:
        usuario.ativo = req.ativo
    if req.escola_id is not None:
        if sessao.get(Escola, req.escola_id) is None:
            raise HTTPException(status_code=404, detail="Escola não encontrada.")
        usuario.escola_id = req.escola_id
    if req.senha:
        usuario.senha_hash = auth_service.gerar_hash_senha(req.senha)

    detalhes = f"Editou cadastro de {usuario.nome}"
    if req.ativo is not None:
        detalhes = (
            f"Reativou {usuario.nome}" if req.ativo else f"Desativou {usuario.nome}"
        )
    elif req.perfil is not None:
        detalhes = f"Alterou perfil de {usuario.nome} para {req.perfil.value}"
    auditoria_service.registrar(
        sessao,
        usuario=usuario_logado,
        tipo="editar_usuario",
        alvo_tipo="usuario",
        alvo_id=usuario.id,
        detalhes=detalhes,
        request=request,
    )
    sessao.commit()
    sessao.refresh(usuario)
    return _serializar_usuario(usuario)


@router.delete("/{usuario_id}")
def remover_usuario(
    usuario_id: int,
    request: Request,
    usuario_logado: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    usuario = sessao.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    try:
        nome = usuario.nome
        sessao.delete(usuario)
        auditoria_service.registrar(
            sessao,
            usuario=usuario_logado,
            tipo="remover_usuario",
            alvo_tipo="usuario",
            alvo_id=usuario_id,
            detalhes=f"Excluiu definitivamente o usuario {nome} #{usuario_id}",
            request=request,
        )
        sessao.commit()
    except IntegrityError:
        sessao.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Usuário possui dados vinculados (ex.: aluno). "
                "Desative-o em vez de excluir."
            ),
        )
    return {"id": usuario_id, "removido": True}
