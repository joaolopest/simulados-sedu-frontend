from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import dominio_labels as labels
from app.api.deps import get_session
from app.api.permissoes import autenticado, criadores_questao
from app.api.routers.questoes import _serializar
from app.enums import PerfilUsuario, StatusQuestao
from app.models import Aluno, Questao, Usuario
from app.services import auditoria_service, ia_controlada_service, questao_service

router = APIRouter(prefix="/ia", tags=["ia-controlada"])


def _aluno_visivel_para_usuario(usuario: Usuario, aluno: Aluno) -> bool:
    if usuario.perfil == PerfilUsuario.ADMIN:
        return True
    if aluno.usuario_id == usuario.id:
        return True
    escola_aluno = aluno.turma.escola_id if aluno.turma else None
    if usuario.perfil in (PerfilUsuario.GESTOR, PerfilUsuario.PROFESSOR, PerfilUsuario.SUPORTE):
        return usuario.escola_id is not None and usuario.escola_id == escola_aluno
    return False


@router.post("/questoes/rascunhos")
def gerar_rascunhos_questoes(
    parametros: dict,
    request: Request,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    resultado = ia_controlada_service.gerar_rascunhos_questoes(parametros)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="gerar_rascunhos_ia",
        alvo_tipo="questao",
        detalhes=f"Gerou {len(resultado['rascunhos'])} rascunhos controlados por IA.",
        request=request,
    )
    sessao.commit()
    return resultado


@router.post("/questoes/rascunhos/salvar", status_code=201)
def salvar_rascunho_ia(
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    rascunho = corpo.get("rascunho") if isinstance(corpo.get("rascunho"), dict) else corpo
    try:
        questao = questao_service.cadastrar_questao(
            sessao,
            enunciado=rascunho.get("enunciado", ""),
            serie=labels.serie_nome(rascunho.get("serie")) or "",
            materia=labels.materia_nome(rascunho.get("materia", "")),
            conteudo=rascunho.get("conteudo", ""),
            nivel=labels.MAP_NIVEL.get(rascunho.get("nivel"), rascunho.get("nivel", "")),
            alternativas=[
                {"texto": a.get("texto"), "correta": bool(a.get("correta"))}
                for a in (rascunho.get("alternativas") or [])
            ],
            adaptacoes=rascunho.get("adaptacoes") or [],
            imagem_url=rascunho.get("imagemUrl") or rascunho.get("imagem_url"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    questao.status = StatusQuestao.RASCUNHO
    questao.competencias = rascunho.get("competencias") or []
    questao.explicacao = rascunho.get("explicacao")
    questao.tempo_estimado_segundos = int(rascunho.get("tempoEstimadoSegundos") or 90)
    questao.criado_por_id = usuario.id
    questao.escola_id = None if usuario.perfil == PerfilUsuario.ADMIN else usuario.escola_id
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="salvar_rascunho_ia",
        alvo_tipo="questao",
        alvo_id=questao.id,
        detalhes="Salvou rascunho gerado por IA para revisao humana.",
        request=request,
    )
    sessao.commit()
    sessao.refresh(questao)
    return {
        "questao": _serializar(questao),
        "revisaoHumanaObrigatoria": True,
        "status": "rascunho",
    }


@router.get("/alunos/{aluno_id}/plano-reforco")
def gerar_plano_reforco_aluno(
    aluno_id: int,
    request: Request,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = sessao.get(Aluno, aluno_id)
    if aluno is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado.")
    if not _aluno_visivel_para_usuario(usuario, aluno):
        raise HTTPException(status_code=403, detail="Aluno fora do seu escopo.")

    resultado = ia_controlada_service.plano_reforco_aluno(sessao, aluno)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="gerar_plano_reforco_ia",
        alvo_tipo="aluno",
        alvo_id=aluno.id,
        detalhes="Gerou plano de reforco controlado por IA.",
        request=request,
    )
    sessao.commit()
    return resultado
