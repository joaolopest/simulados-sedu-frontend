"""Controle de acesso por perfil (RBAC).

Cada rota declara quais perfis podem acessá-la. Se o token for de um perfil
fora da lista, a API responde 403.

Uso como guarda da rota (não precisa do usuário):
    @router.post("", dependencies=[Depends(so_admin)])

Uso recebendo o usuário logado:
    def rota(usuario: Usuario = Depends(admin_gestor)):
        ...
"""

from collections.abc import Callable

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.api.routers.auth import obter_usuario_atual
from app.enums import PerfilUsuario
from app.models import Aluno, Usuario

P = PerfilUsuario


def exigir_perfil(*perfis: PerfilUsuario) -> Callable[..., Usuario]:
    """Cria uma dependência que só deixa passar os perfis informados."""

    def verificador(usuario: Usuario = Depends(obter_usuario_atual)) -> Usuario:
        if usuario.perfil not in perfis:
            raise HTTPException(
                status_code=403,
                detail={
                    "codigo": "PERFIL_NAO_AUTORIZADO",
                    "mensagem": "Seu perfil não tem permissão para esta ação.",
                    "seu_perfil": usuario.perfil.value,
                    "perfis_permitidos": [p.value for p in perfis],
                },
            )
        return usuario

    return verificador


# ---- atalhos prontos ----
autenticado = obter_usuario_atual                       # qualquer usuário logado
so_admin = exigir_perfil(P.ADMIN)                       # só Secretaria
admin_gestor = exigir_perfil(P.ADMIN, P.GESTOR)         # Secretaria + Coordenação
admin_gestor_suporte = exigir_perfil(P.ADMIN, P.GESTOR, P.SUPORTE)  # gestão + acompanhamento (leitura)
so_aluno = exigir_perfil(P.ALUNO, P.CANDIDATO)          # aluno/candidato (autoatendimento)


def exigir_dono_aluno(
    aluno_id: int,
    usuario: Usuario = Depends(so_aluno),
    sessao: Session = Depends(get_session),
) -> Usuario:
    """Garante que o aluno logado só acesse os PRÓPRIOS dados.

    Usado em rotas com `{aluno_id}` no caminho. Resolve o registro de Aluno
    do usuário do token e compara com o id pedido na URL. 403 se for de outro.
    """
    aluno = sessao.scalar(select(Aluno).where(Aluno.usuario_id == usuario.id))
    if aluno is None or aluno.id != aluno_id:
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "ACESSO_NEGADO_DONO",
                "mensagem": "Você só pode acessar os seus próprios dados.",
            },
        )
    return usuario
