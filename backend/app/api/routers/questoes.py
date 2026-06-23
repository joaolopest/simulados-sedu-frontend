from datetime import datetime, timezone

import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.api.permissoes import (
    aplicar_escopo_questoes,
    criadores_questao,
    escola_id_da_questao,
    exigir_dono_ou_gestor_questao,
    leitores_questao,
    usuario_pode_ver_questao,
    so_admin,
)
from app.enums import PerfilUsuario, StatusQuestao
from app.models import (
    Conteudo,
    Materia,
    Nivel,
    Notificacao,
    Questao,
    QuestaoVersao,
    RevisaoQuestao,
    Serie,
    Usuario,
)
from app.services import auditoria_service
from app.services import metricas_questoes_service
from app.services import questao_service

router = APIRouter(prefix="/questoes", tags=["questoes"])


class AlternativaIn(BaseModel):
    texto: str
    correta: bool = False


class CadastrarQuestaoRequest(BaseModel):
    enunciado: str = Field(..., examples=["Qual é a raiz de 2x - 8 = 0?"])
    serie: str = Field(..., examples=["9º ano"])
    materia: str = Field(..., examples=["Matemática"])
    conteudo: str = Field(..., examples=["Funções"])
    nivel: str = Field(..., examples=["Fácil"])
    adaptacoes: list[str] = []
    competencias: list[str] = []
    explicacao: str | None = None
    tempo_estimado_segundos: int = 60
    status: str = "rascunho"
    imagem_url: str | None = None
    criado_por_id: int | None = None
    alternativas: list[AlternativaIn]


class AtualizarQuestaoRequest(BaseModel):
    enunciado: str | None = None
    serie: str | None = None
    materia: str | None = None
    conteudo: str | None = None
    nivel: str | None = None
    adaptacoes: list[str] | None = None
    competencias: list[str] | None = None
    explicacao: str | None = None
    tempo_estimado_segundos: int | None = None
    status: str | None = None
    imagem_url: str | None = None


def _status_enum(valor: str) -> StatusQuestao:
    try:
        return StatusQuestao(valor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"status inválido: {valor}") from exc


def _serializar(questao: Questao) -> dict:
    return {
        "id": questao.id,
        "enunciado": questao.enunciado,
        "imagem_url": questao.imagem_url,
        "serie": questao.serie.nome,
        "materia": questao.materia.nome,
        "conteudo": questao.conteudo.nome,
        "nivel": questao.nivel.nome,
        "adaptacoes": questao.adaptacoes,
        "status": questao.status.value,
        "tempo_estimado_segundos": questao.tempo_estimado_segundos,
        "competencias": questao.competencias,
        "explicacao": questao.explicacao,
        "versao": questao.versao,
        "criado_por_id": questao.criado_por_id,
        "escola_id": questao.escola_id,
        "criada_em": questao.criada_em.isoformat() if questao.criada_em else None,
        "atualizada_em": (
            questao.atualizada_em.isoformat() if questao.atualizada_em else None
        ),
        "alternativas": [
            {
                "id": alt.id,
                "texto": alt.texto,
                "correta": alt.correta,
                "ordem_original": alt.ordem_original,
            }
            for alt in questao.alternativas
        ],
    }


def _snapshot_questao(questao: Questao) -> dict:
    return _serializar(questao)


def _registrar_versao_questao(
    sessao: Session,
    questao: Questao,
    *,
    usuario: Usuario | None,
    motivo: str,
) -> None:
    versao = int(questao.versao or 1)
    existente = sessao.scalar(
        select(QuestaoVersao).where(
            QuestaoVersao.questao_id == questao.id,
            QuestaoVersao.versao == versao,
        )
    )
    snapshot = _snapshot_questao(questao)
    if existente is not None:
        existente.snapshot_json = snapshot
        existente.criado_por_id = usuario.id if usuario else existente.criado_por_id
        existente.motivo = motivo
        return
    sessao.add(
        QuestaoVersao(
            questao_id=questao.id,
            versao=versao,
            snapshot_json=snapshot,
            criado_por_id=usuario.id if usuario else None,
            motivo=motivo,
        )
    )


def _serializar_versao(versao: QuestaoVersao) -> dict:
    return {
        "id": versao.id,
        "questao_id": versao.questao_id,
        "versao": versao.versao,
        "snapshot": versao.snapshot_json or {},
        "criado_por_id": versao.criado_por_id,
        "motivo": versao.motivo,
        "criado_em": versao.criado_em.isoformat() if versao.criado_em else None,
    }


def _aplicar_campos_questao(
    sessao: Session,
    questao: Questao,
    dados: dict,
    *,
    usuario: Usuario,
    permitir_publicar: bool,
) -> None:
    if dados.get("enunciado") is not None:
        questao.enunciado = dados["enunciado"]
    if dados.get("serie") is not None:
        serie = sessao.scalar(select(Serie).where(Serie.nome == dados["serie"]))
        if serie is None:
            raise HTTPException(status_code=422, detail=f"série inexistente: {dados['serie']}")
        questao.serie = serie
    materia_id_para_conteudo = questao.materia_id
    if dados.get("materia") is not None:
        materia = sessao.scalar(select(Materia).where(Materia.nome == dados["materia"]))
        if materia is None:
            raise HTTPException(status_code=422, detail=f"matéria inexistente: {dados['materia']}")
        questao.materia = materia
        materia_id_para_conteudo = materia.id
    if dados.get("nivel") is not None:
        nivel = sessao.scalar(select(Nivel).where(Nivel.nome == dados["nivel"]))
        if nivel is None:
            raise HTTPException(status_code=422, detail=f"nível inexistente: {dados['nivel']}")
        questao.nivel = nivel
    if dados.get("conteudo") is not None:
        cont = sessao.scalar(
            select(Conteudo).where(
                Conteudo.nome == dados["conteudo"],
                Conteudo.materia_id == materia_id_para_conteudo,
            )
        )
        if cont is None:
            cont = Conteudo(nome=dados["conteudo"], materia_id=materia_id_para_conteudo)
            sessao.add(cont)
            sessao.flush()
        questao.conteudo = cont
    if "adaptacoes" in dados and dados["adaptacoes"] is not None:
        questao.adaptacoes = dados["adaptacoes"]
    if "competencias" in dados and dados["competencias"] is not None:
        questao.competencias = dados["competencias"]
    if "explicacao" in dados and dados["explicacao"] is not None:
        questao.explicacao = dados["explicacao"]
    if dados.get("tempo_estimado_segundos") is not None:
        questao.tempo_estimado_segundos = dados["tempo_estimado_segundos"]
    if dados.get("status") is not None:
        if dados["status"] == "publicada" and not permitir_publicar:
            raise HTTPException(
                status_code=403, detail="Apenas admin/gestor publicam questões."
            )
        questao.status = _status_enum(dados["status"])
    if "imagem_url" in dados and dados["imagem_url"] is not None:
        questao.imagem_url = dados["imagem_url"]


def _query_questoes_filtrada(
    sessao: Session,
    usuario: Usuario,
    *,
    escopo: str | None,
    busca: str | None,
    serie: list[str] | None,
    materia: list[str] | None,
    conteudo: list[str] | None,
    nivel: list[str] | None,
    status: list[str] | None,
    adaptacao: list[str] | None,
    competencia: list[str] | None,
    escola_id: list[int] | None,
    criado_por_id: list[int] | None,
    com_imagem: bool | None,
):
    q = (
        sessao.query(Questao)
        .join(Serie, Questao.serie_id == Serie.id)
        .join(Materia, Questao.materia_id == Materia.id)
        .join(Conteudo, Questao.conteudo_id == Conteudo.id)
        .join(Nivel, Questao.nivel_id == Nivel.id)
    )
    q = aplicar_escopo_questoes(q, usuario)
    escopo_normalizado = (escopo or "permitidas").strip().lower()
    if escopo_normalizado not in ("permitidas", "minhas", "escola", "rede"):
        raise HTTPException(status_code=422, detail=f"escopo inválido: {escopo}")
    if escopo_normalizado == "minhas":
        q = q.filter(Questao.criado_por_id == usuario.id)
    elif escopo_normalizado == "escola":
        if usuario.escola_id is None:
            q = q.filter(False)
        else:
            q = q.outerjoin(Usuario, Questao.criado_por_id == Usuario.id).filter(
                or_(
                    Questao.escola_id == usuario.escola_id,
                    and_(
                        Questao.escola_id.is_(None),
                        Usuario.escola_id == usuario.escola_id,
                    ),
                )
            )
    elif escopo_normalizado == "rede":
        if usuario.perfil != PerfilUsuario.ADMIN:
            q = q.filter(
                Questao.status == StatusQuestao.PUBLICADA,
                Questao.escola_id.is_(None),
            )
    if busca:
        q = q.filter(Questao.enunciado.ilike(f"%{busca}%"))
    if serie:
        q = q.filter(Serie.nome.in_(serie))
    if materia:
        q = q.filter(Materia.nome.in_(materia))
    if conteudo:
        q = q.filter(Conteudo.nome.in_(conteudo))
    if nivel:
        q = q.filter(Nivel.nome.in_(nivel))
    if status:
        q = q.filter(Questao.status.in_([_status_enum(s) for s in status]))
    if escola_id:
        q = q.filter(Questao.escola_id.in_(escola_id))
    if criado_por_id:
        q = q.filter(Questao.criado_por_id.in_(criado_por_id))
    if com_imagem is True:
        q = q.filter(Questao.imagem_url.is_not(None), Questao.imagem_url != "")
    elif com_imagem is False:
        q = q.filter(or_(Questao.imagem_url.is_(None), Questao.imagem_url == ""))

    usar_fallback_json = False
    if adaptacao:
        if sessao.get_bind().dialect.name == "postgresql":
            q = q.filter(
                or_(
                    *[
                        Questao.adaptacoes.cast(JSONB).contains([item])
                        for item in adaptacao
                    ]
                )
            )
        else:
            usar_fallback_json = True
    if competencia:
        if sessao.get_bind().dialect.name == "postgresql":
            q = q.filter(
                or_(
                    *[
                        Questao.competencias.cast(JSONB).contains([item])
                        for item in competencia
                    ]
                )
            )
        else:
            usar_fallback_json = True
    return q, usar_fallback_json


def _paginar_questoes_filtradas(
    q,
    *,
    usar_fallback_json: bool,
    pagina: int,
    por_pagina: int,
    adaptacao: list[str] | None,
    competencia: list[str] | None,
) -> tuple[int, list[Questao]]:
    q_pagina = q.options(
        selectinload(Questao.serie),
        selectinload(Questao.materia),
        selectinload(Questao.conteudo),
        selectinload(Questao.nivel),
        selectinload(Questao.alternativas),
    )

    if usar_fallback_json:
        itens = q_pagina.order_by(Questao.id).all()
        if adaptacao:
            itens = [
                it for it in itens if any(a in (it.adaptacoes or []) for a in adaptacao)
            ]
        if competencia:
            itens = [
                it
                for it in itens
                if any(c in (it.competencias or []) for c in competencia)
            ]
        total = len(itens)
        inicio = (pagina - 1) * por_pagina
        return total, itens[inicio : inicio + por_pagina]

    total = q.count()
    itens = (
        q_pagina.order_by(Questao.id)
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
        .all()
    )
    return total, itens


@router.get("", summary="Listar e filtrar questões")
def listar_questoes(
    escopo: str | None = Query(None, description="permitidas|minhas|escola|rede"),
    busca: str | None = Query(None),
    serie: list[str] | None = Query(None, description="Nomes de série (ex.: '9º ano')"),
    materia: list[str] | None = Query(None),
    conteudo: list[str] | None = Query(None),
    nivel: list[str] | None = Query(None),
    status: list[str] | None = Query(None),
    adaptacao: list[str] | None = Query(None),
    competencia: list[str] | None = Query(None),
    escola_id: list[int] | None = Query(None),
    criado_por_id: list[int] | None = Query(None),
    com_imagem: bool | None = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=200),
    usuario: Usuario = Depends(leitores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    q, usar_fallback_json = _query_questoes_filtrada(
        sessao,
        usuario,
        escopo=escopo,
        busca=busca,
        serie=serie,
        materia=materia,
        conteudo=conteudo,
        nivel=nivel,
        status=status,
        adaptacao=adaptacao,
        competencia=competencia,
        escola_id=escola_id,
        criado_por_id=criado_por_id,
        com_imagem=com_imagem,
    )
    total, pagina_itens = _paginar_questoes_filtradas(
        q,
        usar_fallback_json=usar_fallback_json,
        pagina=pagina,
        por_pagina=por_pagina,
        adaptacao=adaptacao,
        competencia=competencia,
    )

    return {
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "dados": [_serializar(x) for x in pagina_itens],
    }


@router.get("/metricas", summary="Listar métricas de qualidade das questões")
def listar_metricas_questoes(
    escopo: str | None = Query(None, description="permitidas|minhas|escola|rede"),
    busca: str | None = Query(None),
    serie: list[str] | None = Query(None, description="Nomes de série (ex.: '9º ano')"),
    materia: list[str] | None = Query(None),
    conteudo: list[str] | None = Query(None),
    nivel: list[str] | None = Query(None),
    status: list[str] | None = Query(None),
    adaptacao: list[str] | None = Query(None),
    competencia: list[str] | None = Query(None),
    escola_id: list[int] | None = Query(None),
    criado_por_id: list[int] | None = Query(None),
    com_imagem: bool | None = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=200),
    usuario: Usuario = Depends(leitores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    q, usar_fallback_json = _query_questoes_filtrada(
        sessao,
        usuario,
        escopo=escopo,
        busca=busca,
        serie=serie,
        materia=materia,
        conteudo=conteudo,
        nivel=nivel,
        status=status,
        adaptacao=adaptacao,
        competencia=competencia,
        escola_id=escola_id,
        criado_por_id=criado_por_id,
        com_imagem=com_imagem,
    )
    total, pagina_itens = _paginar_questoes_filtradas(
        q,
        usar_fallback_json=usar_fallback_json,
        pagina=pagina,
        por_pagina=por_pagina,
        adaptacao=adaptacao,
        competencia=competencia,
    )
    metricas = metricas_questoes_service.metricas_por_questoes(sessao, pagina_itens)
    return {
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "dados": [
            {
                "questao": _serializar(questao),
                "metricas": metricas.get(questao.id, {}),
            }
            for questao in pagina_itens
        ],
    }


def _csv_questoes_response(nome_arquivo: str, linhas: list[dict]) -> Response:
    campos = [
        "id",
        "enunciado",
        "serie",
        "materia",
        "conteudo",
        "nivel",
        "status",
        "escola_id",
        "criado_por_id",
        "alternativas_total",
        "alternativa_correta",
        "criada_em",
        "atualizada_em",
    ]
    saida = StringIO()
    saida.write("\ufeff")
    escritor = csv.DictWriter(saida, fieldnames=campos, extrasaction="ignore")
    escritor.writeheader()
    escritor.writerows(linhas)
    return Response(
        content=saida.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )


def _linha_exportacao_questao(questao: Questao) -> dict:
    correta = next((alt.texto for alt in questao.alternativas if alt.correta), "")
    return {
        "id": questao.id,
        "enunciado": questao.enunciado,
        "serie": questao.serie.nome if questao.serie else "",
        "materia": questao.materia.nome if questao.materia else "",
        "conteudo": questao.conteudo.nome if questao.conteudo else "",
        "nivel": questao.nivel.nome if questao.nivel else "",
        "status": questao.status.value,
        "escola_id": questao.escola_id,
        "criado_por_id": questao.criado_por_id,
        "alternativas_total": len(questao.alternativas),
        "alternativa_correta": correta,
        "criada_em": questao.criada_em.isoformat() if questao.criada_em else None,
        "atualizada_em": (
            questao.atualizada_em.isoformat() if questao.atualizada_em else None
        ),
    }


@router.get("/exportar", summary="Exportar banco de questões filtrado")
def exportar_questoes(
    formato: str = Query("csv", pattern="^(csv|json)$"),
    escopo: str | None = Query(None, description="permitidas|minhas|escola|rede"),
    busca: str | None = Query(None),
    serie: list[str] | None = Query(None, description="Nomes de série (ex.: '9º ano')"),
    materia: list[str] | None = Query(None),
    conteudo: list[str] | None = Query(None),
    nivel: list[str] | None = Query(None),
    status: list[str] | None = Query(None),
    adaptacao: list[str] | None = Query(None),
    competencia: list[str] | None = Query(None),
    escola_id: list[int] | None = Query(None),
    criado_por_id: list[int] | None = Query(None),
    com_imagem: bool | None = Query(None),
    limite: int = Query(5000, ge=1, le=10000),
    usuario: Usuario = Depends(leitores_questao),
    sessao: Session = Depends(get_session),
):
    q, usar_fallback_json = _query_questoes_filtrada(
        sessao,
        usuario,
        escopo=escopo,
        busca=busca,
        serie=serie,
        materia=materia,
        conteudo=conteudo,
        nivel=nivel,
        status=status,
        adaptacao=adaptacao,
        competencia=competencia,
        escola_id=escola_id,
        criado_por_id=criado_por_id,
        com_imagem=com_imagem,
    )
    total, itens = _paginar_questoes_filtradas(
        q,
        usar_fallback_json=usar_fallback_json,
        pagina=1,
        por_pagina=limite,
        adaptacao=adaptacao,
        competencia=competencia,
    )
    linhas = [_linha_exportacao_questao(questao) for questao in itens]
    if formato == "json":
        return {
            "totalFiltrado": total,
            "totalExportado": len(linhas),
            "truncado": total > len(linhas),
            "dados": linhas,
        }
    return _csv_questoes_response("questoes-exportadas.csv", linhas)


def _serializar_revisao(revisao: RevisaoQuestao) -> dict:
    return {
        "id": revisao.id,
        "questao_id": revisao.questao_id,
        "solicitante_id": revisao.solicitante_id,
        "escola_id": revisao.escola_id,
        "tipo": revisao.tipo,
        "motivo": revisao.motivo,
        "proposta": revisao.proposta_json,
        "status": revisao.status,
        "resposta": revisao.resposta,
        "resolvido_por_id": revisao.resolvido_por_id,
        "criado_em": revisao.criado_em.isoformat() if revisao.criado_em else None,
        "resolvido_em": (
            revisao.resolvido_em.isoformat() if revisao.resolvido_em else None
        ),
        "questao": _serializar(revisao.questao) if revisao.questao else None,
    }


class ResolverRevisaoRequest(BaseModel):
    status: str = Field(..., examples=["aprovada"])
    resposta: str | None = None


@router.get("/revisoes", dependencies=[Depends(so_admin)])
def listar_revisoes(
    status: str | None = Query("pendente"),
    sessao: Session = Depends(get_session),
) -> dict:
    q = sessao.query(RevisaoQuestao).order_by(RevisaoQuestao.criado_em.desc())
    if status:
        q = q.filter(RevisaoQuestao.status == status)
    dados = [_serializar_revisao(r) for r in q.all()]
    return {"dados": dados, "total": len(dados)}


@router.patch("/revisoes/{revisao_id}", dependencies=[Depends(so_admin)])
def resolver_revisao(
    revisao_id: int,
    req: ResolverRevisaoRequest,
    request: Request,
    usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    revisao = sessao.get(RevisaoQuestao, revisao_id)
    if revisao is None:
        raise HTTPException(status_code=404, detail="Revisão não encontrada.")
    if req.status not in ("aprovada", "rejeitada"):
        raise HTTPException(status_code=422, detail="Status deve ser aprovada ou rejeitada.")

    revisao.status = req.status
    revisao.resposta = req.resposta
    revisao.resolvido_por_id = usuario.id
    revisao.resolvido_em = datetime.now(timezone.utc)

    proposta = dict(revisao.proposta_json or {})
    status_anterior = proposta.pop("_status_anterior", None)
    if revisao.questao:
        if req.status == "aprovada" and revisao.tipo == "exclusao":
            revisao.questao.status = StatusQuestao.ARQUIVADA
            revisao.questao.atualizada_em = datetime.now(timezone.utc)
        elif req.status == "aprovada" and revisao.tipo == "edicao":
            if proposta:
                _aplicar_campos_questao(
                    sessao,
                    revisao.questao,
                    proposta,
                    usuario=usuario,
                    permitir_publicar=True,
                )
                if "status" not in proposta and revisao.questao.status == StatusQuestao.EM_REVISAO:
                    revisao.questao.status = _status_enum(status_anterior or "rascunho")
                revisao.questao.versao = (revisao.questao.versao or 1) + 1
                revisao.questao.atualizada_em = datetime.now(timezone.utc)
                sessao.flush()
                _registrar_versao_questao(
                    sessao,
                    revisao.questao,
                    usuario=usuario,
                    motivo=f"revisao aprovada #{revisao.id}",
                )
            elif revisao.questao.status == StatusQuestao.EM_REVISAO:
                revisao.questao.status = _status_enum(status_anterior or "rascunho")
                revisao.questao.atualizada_em = datetime.now(timezone.utc)
        elif req.status == "rejeitada" and revisao.questao.status == StatusQuestao.EM_REVISAO:
            revisao.questao.status = _status_enum(status_anterior or "rascunho")
            revisao.questao.atualizada_em = datetime.now(timezone.utc)

    sessao.add(
        Notificacao(
            tipo="revisao_questao",
            titulo=f"Revisão {req.status}",
            mensagem=req.resposta or f"Sua solicitação foi {req.status}.",
            destinatario_id=revisao.solicitante_id,
            origem_id=str(revisao.questao_id),
            origem_tipo="questao",
            acao_url=f"/professor/questoes",
            acao_label="Ver questões",
        )
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="resolucao_revisao",
        alvo_tipo="revisao_questao",
        alvo_id=revisao.id,
        detalhes=f"Revisao {req.status}: {req.resposta or ''}".strip(),
        request=request,
    )
    sessao.commit()
    sessao.refresh(revisao)
    return _serializar_revisao(revisao)


@router.get("/{questao_id}")
def detalhar_questao(
    questao_id: int,
    usuario: Usuario = Depends(leitores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    if not usuario_pode_ver_questao(sessao, usuario, questao):
        raise HTTPException(status_code=403, detail="Questão fora do seu escopo.")
    return _serializar(questao)


@router.get("/{questao_id}/versoes")
def listar_versoes_questao(
    questao_id: int,
    usuario: Usuario = Depends(leitores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    if not usuario_pode_ver_questao(sessao, usuario, questao):
        raise HTTPException(status_code=403, detail="Questão fora do seu escopo.")
    versoes = sessao.scalars(
        select(QuestaoVersao)
        .where(QuestaoVersao.questao_id == questao_id)
        .order_by(QuestaoVersao.versao.desc())
    ).all()
    return {
        "questao_id": questao_id,
        "versao_atual": questao.versao,
        "dados": [_serializar_versao(v) for v in versoes],
        "total": len(versoes),
    }


@router.post("", status_code=201, summary="Cadastrar questão")
def cadastrar_questao(
    req: CadastrarQuestaoRequest,
    request: Request,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    try:
        questao = questao_service.cadastrar_questao(
            sessao,
            enunciado=req.enunciado,
            serie=req.serie,
            materia=req.materia,
            conteudo=req.conteudo,
            nivel=req.nivel,
            alternativas=[a.model_dump() for a in req.alternativas],
            adaptacoes=req.adaptacoes,
            imagem_url=req.imagem_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Campos de fidelidade que o service não cobre.
    if usuario.perfil == PerfilUsuario.ADMIN:
        questao.status = _status_enum(req.status)
    elif usuario.perfil == PerfilUsuario.GESTOR:
        questao.status = _status_enum(req.status)
    else:
        questao.status = StatusQuestao.RASCUNHO
    questao.tempo_estimado_segundos = req.tempo_estimado_segundos
    questao.competencias = req.competencias
    questao.explicacao = req.explicacao
    questao.criado_por_id = usuario.id  # dono = quem criou (ignora criado_por_id do body)
    questao.escola_id = None if usuario.perfil == PerfilUsuario.ADMIN else usuario.escola_id
    sessao.flush()
    _registrar_versao_questao(
        sessao,
        questao,
        usuario=usuario,
        motivo="criacao",
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="criar_questao",
        alvo_tipo="questao",
        alvo_id=questao.id,
        detalhes=f"Cadastrou questao de {questao.materia.nome} ({questao.nivel.nome})",
        request=request,
    )
    sessao.commit()
    sessao.refresh(questao)
    return _serializar(questao)


@router.patch("/{questao_id}")
def atualizar_questao(
    questao_id: int,
    req: AtualizarQuestaoRequest,
    request: Request,
    usuario: Usuario = Depends(exigir_dono_ou_gestor_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")

    dados = req.model_dump(exclude_none=True)
    _aplicar_campos_questao(
        sessao,
        questao,
        dados,
        usuario=usuario,
        permitir_publicar=usuario.perfil in (PerfilUsuario.ADMIN, PerfilUsuario.GESTOR),
    )

    questao.versao = (questao.versao or 1) + 1
    questao.atualizada_em = datetime.now(timezone.utc)
    sessao.flush()
    _registrar_versao_questao(
        sessao,
        questao,
        usuario=usuario,
        motivo="edicao direta",
    )
    tipo_auditoria = "publicar_questao" if req.status == "publicada" else "editar_questao"
    detalhes = (
        f"Alterou status para {req.status}"
        if req.status is not None
        else f"Editou questao de {questao.materia.nome}"
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo=tipo_auditoria,
        alvo_tipo="questao",
        alvo_id=questao.id,
        detalhes=detalhes,
        request=request,
    )
    sessao.commit()
    sessao.refresh(questao)
    return _serializar(questao)


@router.delete("/{questao_id}")
def remover_questao(
    questao_id: int,
    request: Request,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")

    if usuario.perfil == PerfilUsuario.ADMIN:
        try:
            sessao.delete(questao)
            auditoria_service.registrar(
                sessao,
                usuario=usuario,
                tipo="remover_questao",
                alvo_tipo="questao",
                alvo_id=questao_id,
                detalhes=f"Removeu fisicamente a questao #{questao_id}",
                request=request,
            )
            sessao.commit()
            return {"id": questao_id, "removida": True, "arquivada": False}
        except IntegrityError:
            sessao.rollback()
            questao = sessao.get(Questao, questao_id)
            if questao is None:
                return {"id": questao_id, "removida": True, "arquivada": False}
            questao.status = StatusQuestao.ARQUIVADA
            questao.atualizada_em = datetime.now(timezone.utc)
            auditoria_service.registrar(
                sessao,
                usuario=usuario,
                tipo="arquivar_questao",
                alvo_tipo="questao",
                alvo_id=questao_id,
                detalhes=f"Arquivou questao #{questao_id} porque ela ja estava em uso",
                request=request,
            )
            sessao.commit()
            return {"id": questao_id, "removida": False, "arquivada": True}

    if usuario.perfil == PerfilUsuario.GESTOR:
        escola_id = escola_id_da_questao(sessao, questao)
        if escola_id != usuario.escola_id and questao.criado_por_id != usuario.id:
            raise HTTPException(
                status_code=403,
                detail="Gestor só pode arquivar questões da própria escola.",
            )
    elif questao.criado_por_id != usuario.id:
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "SOLICITE_REVISAO",
                "mensagem": "Solicite revisão para arquivar questão de outro autor.",
            },
        )

    questao.status = StatusQuestao.ARQUIVADA
    questao.atualizada_em = datetime.now(timezone.utc)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="arquivar_questao",
        alvo_tipo="questao",
        alvo_id=questao_id,
        detalhes=f"Arquivou questao #{questao_id}",
        request=request,
    )
    sessao.commit()
    return {"id": questao_id, "removida": False, "arquivada": True}


class SolicitarRevisaoRequest(BaseModel):
    tipo: str = "edicao"  # "exclusao" | "edicao"
    motivo: str | None = None
    proposta: AtualizarQuestaoRequest | None = None


@router.post("/{questao_id}/solicitar-revisao", status_code=201)
def solicitar_revisao_questao(
    questao_id: int,
    req: SolicitarRevisaoRequest,
    request: Request,
    usuario: Usuario = Depends(criadores_questao),
    sessao: Session = Depends(get_session),
) -> dict:
    """Professor/gestor pedem revisão (excluir ou editar questão alheia).

    Não altera a questão: apenas notifica os admins e registra auditoria.
    """
    questao = sessao.get(Questao, questao_id)
    if questao is None:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    if not usuario_pode_ver_questao(sessao, usuario, questao):
        raise HTTPException(status_code=403, detail="Questão fora do seu escopo.")
    tipo = "exclusao" if req.tipo == "exclusao" else "edicao"
    escola_id = escola_id_da_questao(sessao, questao)
    existente = sessao.scalar(
        select(RevisaoQuestao).where(
            RevisaoQuestao.questao_id == questao_id,
            RevisaoQuestao.solicitante_id == usuario.id,
            RevisaoQuestao.tipo == tipo,
            RevisaoQuestao.status == "pendente",
        )
    )
    if existente is not None:
        return {"ok": True, "id": existente.id, "tipo": tipo, "status": existente.status, "notificados": 0}

    proposta = req.proposta.model_dump(exclude_none=True) if req.proposta else {}
    proposta["_status_anterior"] = questao.status.value
    revisao = RevisaoQuestao(
        questao_id=questao_id,
        solicitante_id=usuario.id,
        escola_id=escola_id,
        tipo=tipo,
        motivo=req.motivo,
        proposta_json=proposta or None,
        status="pendente",
    )
    sessao.add(revisao)
    sessao.flush()
    if questao.status != StatusQuestao.ARQUIVADA:
        questao.status = StatusQuestao.EM_REVISAO
        questao.atualizada_em = datetime.now(timezone.utc)
    rotulo = "exclusão" if tipo == "exclusao" else "edição"
    resumo = (questao.enunciado or "")[:60]
    msg = f"{usuario.nome} solicitou {rotulo} da questão #{questao_id} ({resumo}…)."
    if req.motivo:
        msg += f" Motivo: {req.motivo}"
    destinatarios = sessao.scalars(
        select(Usuario).where(
            Usuario.ativo.is_(True),
            (
                (Usuario.perfil == PerfilUsuario.ADMIN)
                | (
                    (Usuario.perfil == PerfilUsuario.GESTOR)
                    & (Usuario.escola_id == escola_id)
                )
            ),
        )
    ).all()
    vistos: set[int] = set()
    for adm in destinatarios:
        if adm.id == usuario.id or adm.id in vistos:
            continue
        vistos.add(adm.id)
        sessao.add(
            Notificacao(
                tipo="revisao_questao",
                titulo=f"Revisão solicitada: {rotulo} de questão",
                mensagem=msg,
                destinatario_id=adm.id,
                origem_id=str(questao_id),
                origem_tipo="questao",
                acao_url=f"/admin/questoes/{questao_id}",
                acao_label="Ver questão",
            )
        )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="solicitacao_revisao",
        alvo_tipo="questao",
        alvo_id=questao_id,
        detalhes=f"{msg} Revisao #{revisao.id}.",
        request=request,
    )
    sessao.commit()
    return {
        "ok": True,
        "id": revisao.id,
        "tipo": tipo,
        "status": revisao.status,
        "notificados": len(vistos),
    }
