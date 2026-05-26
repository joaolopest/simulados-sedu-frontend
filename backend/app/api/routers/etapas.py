"""Endpoints de ETAPAS avaliativas (admin).

    GET    /etapas                 lista (filtros: status, tipo, publico_alvo)
    POST   /etapas                 cria nova etapa
    GET    /etapas/{id}            detalhe
    PATCH  /etapas/{id}            atualiza
    GET    /etapas/{id}/relatorio  relatório agregado (só pra REALIZADA)
    GET    /etapas/{id}/faltas     faltas dessa etapa
    POST   /etapas/{id}/reagendar  cria agendamento de reposição
    POST   /etapas/{id}/presenca   registra folha de presença
    GET    /etapas/{id}/presenca   consulta folha registrada
"""

from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import (
    StatusAgendamento,
    StatusEtapa,
    StatusPresenca,
    TipoEtapa,
    TipoProva,
    VinculoAluno,
)
from app.models import (
    Agendamento,
    Etapa,
    Falta,
    FolhaPresenca,
    RegistroPresenca,
    Resposta,
    Usuario,
)

router = APIRouter(prefix="/etapas", tags=["etapas"])


# ---------- Schemas ----------


class EtapaCriarRequest(BaseModel):
    nome: str
    tipo: TipoEtapa
    tipo_prova: TipoProva
    publico_alvo: VinculoAluno
    serie_id: int | None = None
    escola_id: int | None = None
    edital_id: int | None = None
    data: date
    hora: time
    duracao_min: int = Field(..., ge=15, le=480)
    local: str
    oferece_suporte: bool = False
    adaptacoes_aceitas: list[str] = []
    materias: list[str] = []
    criado_por: int


class EtapaAtualizarRequest(BaseModel):
    nome: str | None = None
    status: StatusEtapa | None = None
    data: date | None = None
    hora: time | None = None
    duracao_min: int | None = Field(None, ge=15, le=480)
    local: str | None = None
    oferece_suporte: bool | None = None
    adaptacoes_aceitas: list[str] | None = None
    materias: list[str] | None = None


class ReagendarRequest(BaseModel):
    aluno_id: int
    etapa_destino_id: int
    observacoes: str | None = None


class RegistroPresencaIn(BaseModel):
    aluno_id: int
    status: StatusPresenca
    hora_chegada: time | None = None
    observacoes: str | None = None


class RegistrarPresencaRequest(BaseModel):
    registrado_por: int
    registros: list[RegistroPresencaIn] = Field(..., min_length=1)


# ---------- Helpers ----------


def _resumo(etapa: Etapa) -> dict:
    return {
        "id": etapa.id,
        "nome": etapa.nome,
        "tipo": etapa.tipo.value,
        "tipo_prova": etapa.tipo_prova.value,
        "publico_alvo": etapa.publico_alvo.value,
        "serie_id": etapa.serie_id,
        "escola_id": etapa.escola_id,
        "edital_id": etapa.edital_id,
        "data": etapa.data.isoformat(),
        "hora": etapa.hora.isoformat(timespec="minutes"),
        "duracao_min": etapa.duracao_min,
        "local": etapa.local,
        "oferece_suporte": etapa.oferece_suporte,
        "adaptacoes_aceitas": etapa.adaptacoes_aceitas,
        "materias": etapa.materias,
        "questao_ids": etapa.questao_ids,
        "status": etapa.status.value,
        "criado_em": etapa.criado_em.isoformat(),
    }


def _carregar_etapa(sessao: Session, etapa_id: int) -> Etapa:
    etapa = sessao.get(Etapa, etapa_id)
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada.")
    return etapa


# ---------- CRUD ----------


@router.get("")
def listar(
    status: StatusEtapa | None = Query(None),
    tipo: TipoEtapa | None = Query(None),
    publico_alvo: VinculoAluno | None = Query(None),
    busca: str | None = Query(None),
    sessao: Session = Depends(get_session),
) -> list[dict]:
    q = sessao.query(Etapa)
    if status:
        q = q.filter(Etapa.status == status)
    if tipo:
        q = q.filter(Etapa.tipo == tipo)
    if publico_alvo:
        q = q.filter(Etapa.publico_alvo == publico_alvo)
    if busca:
        termo = f"%{busca.lower()}%"
        q = q.filter(Etapa.nome.ilike(termo) | Etapa.local.ilike(termo))
    return [_resumo(e) for e in q.order_by(Etapa.data.desc()).all()]


@router.post("", status_code=201)
def criar(req: EtapaCriarRequest, sessao: Session = Depends(get_session)) -> dict:
    if not sessao.get(Usuario, req.criado_por):
        raise HTTPException(status_code=400, detail="criado_por não corresponde a usuário existente.")
    etapa = Etapa(
        nome=req.nome,
        tipo=req.tipo,
        tipo_prova=req.tipo_prova,
        publico_alvo=req.publico_alvo,
        serie_id=req.serie_id,
        escola_id=req.escola_id,
        edital_id=req.edital_id,
        data=req.data,
        hora=req.hora,
        duracao_min=req.duracao_min,
        local=req.local,
        oferece_suporte=req.oferece_suporte,
        adaptacoes_aceitas=req.adaptacoes_aceitas,
        materias=req.materias,
        questao_ids=[],
        status=StatusEtapa.RASCUNHO,
        criado_por=req.criado_por,
    )
    sessao.add(etapa)
    sessao.commit()
    sessao.refresh(etapa)
    return _resumo(etapa)


@router.get("/{etapa_id}")
def detalhar(etapa_id: int, sessao: Session = Depends(get_session)) -> dict:
    return _resumo(_carregar_etapa(sessao, etapa_id))


@router.patch("/{etapa_id}")
def atualizar(
    etapa_id: int,
    req: EtapaAtualizarRequest,
    sessao: Session = Depends(get_session),
) -> dict:
    etapa = _carregar_etapa(sessao, etapa_id)
    dados = req.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(etapa, campo, valor)
    sessao.commit()
    sessao.refresh(etapa)
    return _resumo(etapa)


# ---------- Relatório ----------


@router.get("/{etapa_id}/relatorio")
def relatorio(etapa_id: int, sessao: Session = Depends(get_session)) -> dict:
    etapa = _carregar_etapa(sessao, etapa_id)
    if etapa.status is not StatusEtapa.REALIZADA:
        raise HTTPException(
            status_code=409,
            detail={
                "codigo": "RELATORIO_INDISPONIVEL",
                "mensagem": "A etapa ainda não foi realizada.",
            },
        )

    inscritos = (
        sessao.query(Agendamento).filter(Agendamento.etapa_id == etapa_id).count()
    )
    presencas_q = sessao.query(RegistroPresenca).join(FolhaPresenca).filter(
        FolhaPresenca.etapa_id == etapa_id,
    )
    presentes = presencas_q.filter(
        RegistroPresenca.status.in_([StatusPresenca.PRESENTE, StatusPresenca.ATRASADO]),
    ).count()
    ausentes = presencas_q.filter(
        RegistroPresenca.status.in_([StatusPresenca.AUSENTE, StatusPresenca.JUSTIFICADO]),
    ).count()

    respostas_etapa = (
        sessao.query(Resposta).filter(Resposta.questao_id.in_(etapa.questao_ids)).all()
        if etapa.questao_ids
        else []
    )
    if respostas_etapa:
        acertos = sum(1 for r in respostas_etapa if r.correta)
        taxa_acerto = acertos / len(respostas_etapa)
    else:
        taxa_acerto = 0.0

    return {
        "etapa_id": etapa.id,
        "nome_etapa": etapa.nome,
        "realizada_em": etapa.atualizado_em.isoformat(),
        "total_inscritos": inscritos,
        "total_comparecimentos": presentes,
        "total_faltas": ausentes,
        "taxa_acerto_medio": round(taxa_acerto, 3),
        "taxa_aprovacao_estimada": round(taxa_acerto, 3),
        "taxa_reprovacao_estimada": round(max(0.0, 1.0 - taxa_acerto), 3),
        "tipos_prova": [{"tipo": etapa.tipo_prova.value, "total": presentes}],
    }


# ---------- Faltas ----------


@router.get("/{etapa_id}/faltas")
def listar_faltas(etapa_id: int, sessao: Session = Depends(get_session)) -> dict:
    _carregar_etapa(sessao, etapa_id)
    faltas = sessao.query(Falta).filter(Falta.etapa_id == etapa_id).all()
    return {
        "etapa_id": etapa_id,
        "total": len(faltas),
        "pode_reagendar": sum(1 for f in faltas if f.pode_reagendar),
        "faltas": [
            {
                "id": f.id,
                "aluno_id": f.aluno_id,
                "motivo": f.motivo,
                "pode_reagendar": f.pode_reagendar,
                "reagendado_para_etapa_id": f.reagendado_para_etapa_id,
                "registrada_em": f.registrada_em.isoformat(),
            }
            for f in faltas
        ],
    }


@router.post("/{etapa_id}/reagendar", status_code=201)
def reagendar(
    etapa_id: int, req: ReagendarRequest, sessao: Session = Depends(get_session),
) -> dict:
    _carregar_etapa(sessao, etapa_id)
    destino = sessao.get(Etapa, req.etapa_destino_id)
    if not destino:
        raise HTTPException(status_code=404, detail="Etapa destino não encontrada.")
    if destino.status not in (StatusEtapa.AGENDADA, StatusEtapa.RASCUNHO):
        raise HTTPException(
            status_code=409,
            detail="Etapa destino precisa estar agendada ou em rascunho.",
        )

    falta = (
        sessao.query(Falta)
        .filter(Falta.etapa_id == etapa_id, Falta.aluno_id == req.aluno_id)
        .one_or_none()
    )
    if falta and not falta.pode_reagendar:
        raise HTTPException(status_code=409, detail="Aluno bloqueado para reagendamento.")

    novo = Agendamento(
        aluno_id=req.aluno_id,
        etapa_id=req.etapa_destino_id,
        status=StatusAgendamento.AGENDADO,
        observacoes=req.observacoes or "Reagendamento por falta.",
    )
    sessao.add(novo)
    if falta:
        falta.reagendado_para_etapa_id = req.etapa_destino_id
    sessao.commit()
    sessao.refresh(novo)
    return {
        "id": novo.id,
        "aluno_id": novo.aluno_id,
        "etapa_id": novo.etapa_id,
        "status": novo.status.value,
        "agendado_em": novo.agendado_em.isoformat(),
    }


# ---------- Presença ----------


def _serializar_folha(folha: FolhaPresenca, etapa: Etapa) -> dict:
    contagem = {s: 0 for s in StatusPresenca}
    for r in folha.registros:
        contagem[r.status] += 1
    return {
        "tipo_publico": "candidato" if etapa.publico_alvo is VinculoAluno.SUPLETIVO else "aluno",
        "publico_alvo": etapa.publico_alvo.value,
        "folha": {
            "etapa_id": etapa.id,
            "nome_etapa": etapa.nome,
            "data": etapa.data.isoformat(),
            "registrado_por": folha.registrado_por,
            "registrado_em": folha.registrado_em.isoformat(),
            "total_presentes": contagem[StatusPresenca.PRESENTE],
            "total_atrasados": contagem[StatusPresenca.ATRASADO],
            "total_ausentes": contagem[StatusPresenca.AUSENTE],
            "total_justificados": contagem[StatusPresenca.JUSTIFICADO],
            "registros": [
                {
                    "aluno_id": r.aluno_id,
                    "status": r.status.value,
                    "hora_chegada": r.hora_chegada.isoformat(timespec="minutes")
                    if r.hora_chegada
                    else None,
                    "observacoes": r.observacoes,
                }
                for r in folha.registros
            ],
        },
    }


@router.get("/{etapa_id}/presenca")
def get_presenca(etapa_id: int, sessao: Session = Depends(get_session)) -> dict:
    etapa = _carregar_etapa(sessao, etapa_id)
    folha = (
        sessao.query(FolhaPresenca).filter(FolhaPresenca.etapa_id == etapa_id).one_or_none()
    )
    if not folha:
        raise HTTPException(status_code=404, detail="Presença ainda não registrada.")
    return _serializar_folha(folha, etapa)


@router.post("/{etapa_id}/presenca", status_code=201)
def registrar_presenca(
    etapa_id: int,
    req: RegistrarPresencaRequest,
    sessao: Session = Depends(get_session),
) -> dict:
    etapa = _carregar_etapa(sessao, etapa_id)
    if not sessao.get(Usuario, req.registrado_por):
        raise HTTPException(status_code=400, detail="registrado_por não existe.")

    folha = (
        sessao.query(FolhaPresenca).filter(FolhaPresenca.etapa_id == etapa_id).one_or_none()
    )
    if folha:
        # sobrescreve registros existentes (idempotente)
        for r in folha.registros:
            sessao.delete(r)
        folha.registrado_por = req.registrado_por
        folha.registrado_em = datetime.utcnow()
    else:
        folha = FolhaPresenca(etapa_id=etapa_id, registrado_por=req.registrado_por)
        sessao.add(folha)
        sessao.flush()

    for r in req.registros:
        sessao.add(
            RegistroPresenca(
                folha_id=folha.id,
                aluno_id=r.aluno_id,
                status=r.status,
                hora_chegada=r.hora_chegada,
                observacoes=r.observacoes,
            ),
        )

    sessao.commit()
    sessao.refresh(folha)
    return _serializar_folha(folha, etapa)
