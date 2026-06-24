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
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Query, Session

from app.api.deps import get_session
from app.api.routers.auth import obter_usuario_atual
from app.enums import PerfilUsuario, StatusQuestao
from app.models import Aluno, Questao, Usuario

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
criadores_questao = exigir_perfil(P.ADMIN, P.GESTOR, P.PROFESSOR)   # quem pode adicionar questão
montadores_prova = exigir_perfil(P.ADMIN, P.GESTOR, P.PROFESSOR)    # quem pode montar/liberar prova
leitores_questao = exigir_perfil(P.ADMIN, P.GESTOR, P.SUPORTE, P.PROFESSOR)  # quem pode ler o banco


def escola_id_da_questao(sessao: Session, questao: Questao) -> int | None:
    """Resolve a escola efetiva da questão, inclusive dados antigos sem escola_id."""
    if questao.escola_id is not None:
        return questao.escola_id
    if questao.criado_por_id is None:
        return None
    autor = sessao.get(Usuario, questao.criado_por_id)
    return autor.escola_id if autor else None


def usuario_pode_ver_questao(sessao: Session, usuario: Usuario, questao: Questao) -> bool:
    if usuario.perfil == P.ADMIN:
        return True
    if questao.criado_por_id == usuario.id:
        return True
    escola_id = escola_id_da_questao(sessao, questao)
    if usuario.perfil in (P.GESTOR, P.SUPORTE, P.PROFESSOR):
        return (
            questao.status == StatusQuestao.PUBLICADA
            and (escola_id is None or escola_id == usuario.escola_id)
        )
    return False


def aplicar_escopo_questoes(query: Query, usuario: Usuario) -> Query:
    """Aplica o escopo de leitura do banco de questões no SQL."""
    if usuario.perfil == P.ADMIN:
        return query

    publicadas = Questao.status == StatusQuestao.PUBLICADA
    if usuario.perfil == P.GESTOR:
        if usuario.escola_id is None:
            return query.filter(
                or_(
                    Questao.criado_por_id == usuario.id,
                    and_(publicadas, Questao.escola_id.is_(None)),
                ),
            )
        return query.filter(
            or_(
                Questao.criado_por_id == usuario.id,
                and_(
                    publicadas,
                    or_(
                        Questao.escola_id == usuario.escola_id,
                        Questao.escola_id.is_(None),
                    ),
                ),
            ),
        )

    if usuario.perfil == P.PROFESSOR:
        escopo_publicado = (
            or_(Questao.escola_id == usuario.escola_id, Questao.escola_id.is_(None))
            if usuario.escola_id is not None
            else Questao.escola_id.is_(None)
        )
        return query.filter(
            or_(Questao.criado_por_id == usuario.id, and_(publicadas, escopo_publicado))
        )

    if usuario.perfil == P.SUPORTE:
        if usuario.escola_id is None:
            return query.filter(publicadas, Questao.escola_id.is_(None))
        return query.filter(
            publicadas,
            or_(Questao.escola_id == usuario.escola_id, Questao.escola_id.is_(None)),
        )

    return query.filter(False)


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


def exigir_dono_ou_gestor_questao(
    questao_id: int,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
) -> Usuario:
    """Edição de questão: admin/gestor podem tudo; professor só a própria.

    Usado nas rotas de editar questão. Professor que tenta mexer numa questão
    que não criou recebe 403 (e a UI oferece 'solicitar revisão').
    """
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    if usuario.perfil == P.ADMIN:
        return usuario
    if usuario.perfil == P.GESTOR:
        escola_id = escola_id_da_questao(sessao, questao)
        if escola_id == usuario.escola_id or questao.criado_por_id == usuario.id:
            return usuario
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "QUESTAO_FORA_DA_ESCOLA",
                "mensagem": "Gestor só pode alterar questões da própria escola.",
            },
        )
    if questao.criado_por_id != usuario.id:
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "QUESTAO_DE_OUTRO_AUTOR",
                "mensagem": "Você só pode editar questões que você criou. Solicite revisão.",
            },
        )
    return usuario
