"""Endpoints da camada do ALUNO/CANDIDATO.

Cada endpoint marca claramente se é 🔴 ESCOLA, 🔵 SUPLETIVO ou 🔵🔴 ambos
(conforme o quadro detalhado). Quando exclusivo, retorna 403 pro vínculo errado.

    GET    /aluno/{id}/calendario        🔵🔴 provas futuras/passadas (+ letivo só 🔴)
    GET    /aluno/{id}/agendamentos      🔵🔴 lista próprios agendamentos
    POST   /aluno/{id}/agendamentos      🔵    inscreve em etapa
    DELETE /aluno/agendamentos/{id}      🔵    cancela
    GET    /aluno/{id}/editais           🔵    editais vigentes
    GET    /aluno/{id}/resultados        🔵🔴 resultados próprios
    GET    /aluno/{id}/guia-estudos      🔵🔴 gera guia das competências fracas
    POST   /aluno/{id}/simulado-estudo   🔵    cria simulado pra estudo
"""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.enums import StatusAgendamento, StatusEtapa, VinculoAluno
from app.models import (
    Agendamento,
    Aluno,
    AssuntoEstudo,
    Edital,
    Etapa,
    GuiaEstudo,
    ItemCalendarioLetivo,
    Resposta,
    Simulado,
)
from app.services.vinculo_service import exigir_vinculo, obter_vinculo

router = APIRouter(prefix="/aluno", tags=["aluno"])


def _carregar_aluno(sessao: Session, aluno_id: int) -> Aluno:
    aluno = sessao.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    return aluno


# ============================================================================
# CALENDÁRIO — 🔵🔴 (letivo só pra 🔴)
# ============================================================================


@router.get("/{aluno_id}/calendario")
def calendario(aluno_id: int, sessao: Session = Depends(get_session)) -> dict:
    aluno = _carregar_aluno(sessao, aluno_id)
    vinculo = obter_vinculo(aluno)

    agendamentos = (
        sessao.query(Agendamento).filter(Agendamento.aluno_id == aluno_id).all()
    )
    etapa_ids = {a.etapa_id for a in agendamentos}
    etapas = (
        sessao.query(Etapa)
        .filter(Etapa.id.in_(etapa_ids), Etapa.publico_alvo == vinculo)
        .all()
        if etapa_ids
        else []
    )

    futuras = [
        {
            "etapa_id": e.id,
            "nome": e.nome,
            "tipo": e.tipo.value,
            "data": e.data.isoformat(),
            "hora": e.hora.isoformat(timespec="minutes"),
            "local": e.local,
            "duracao_min": e.duracao_min,
        }
        for e in etapas
        if e.status in (StatusEtapa.AGENDADA, StatusEtapa.EM_ANDAMENTO)
    ]
    mapa_age = {a.etapa_id: a for a in agendamentos}
    passadas = [
        {
            "etapa_id": e.id,
            "nome": e.nome,
            "tipo": e.tipo.value,
            "data": e.data.isoformat(),
            "local": e.local,
            "status_aluno": mapa_age[e.id].status.value if e.id in mapa_age else "realizado",
        }
        for e in etapas
        if e.status is StatusEtapa.REALIZADA
    ]

    if vinculo is VinculoAluno.ESCOLA and aluno.turma:
        itens_letivo = (
            sessao.query(ItemCalendarioLetivo)
            .filter(
                (ItemCalendarioLetivo.escola_id.is_(None))
                | (ItemCalendarioLetivo.escola_id == aluno.turma.escola_id),
            )
            .all()
        )
        letivo = [
            {
                "id": i.id,
                "titulo": i.titulo,
                "data": i.data.isoformat(),
                "tipo": i.tipo.value,
            }
            for i in itens_letivo
        ]
    else:
        letivo = []

    return {
        "vinculo": vinculo.value,
        "provas_futuras": futuras,
        "provas_passadas": passadas,
        "calendario_letivo": letivo,
    }


# ============================================================================
# AGENDAMENTOS
# ============================================================================


class InscricaoRequest(BaseModel):
    etapa_id: int
    observacoes: str | None = None


@router.get("/{aluno_id}/agendamentos")
def listar_agendamentos(aluno_id: int, sessao: Session = Depends(get_session)) -> dict:
    aluno = _carregar_aluno(sessao, aluno_id)
    lista = (
        sessao.query(Agendamento).filter(Agendamento.aluno_id == aluno_id).all()
    )
    futuras_status = {StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO}
    futuras = [_serializar_agendamento(a) for a in lista if a.status in futuras_status]
    anteriores = [
        _serializar_agendamento(a) for a in lista if a.status not in futuras_status
    ]
    return {
        "vinculo": obter_vinculo(aluno).value,
        "futuras": futuras,
        "anteriores": anteriores,
    }


@router.post("/{aluno_id}/agendamentos", status_code=201)
def inscrever_em_etapa(
    aluno_id: int,
    req: InscricaoRequest,
    sessao: Session = Depends(get_session),
) -> dict:
    """🔵 supletivo apenas. Aluno escolar é agendado pela admin."""
    aluno = _carregar_aluno(sessao, aluno_id)
    exigir_vinculo(aluno, VinculoAluno.SUPLETIVO)

    etapa = sessao.get(Etapa, req.etapa_id)
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada.")
    if etapa.publico_alvo is not VinculoAluno.SUPLETIVO:
        raise HTTPException(
            status_code=409,
            detail="Esta etapa é da rede escolar — o agendamento é feito pela escola.",
        )
    if etapa.status not in (StatusEtapa.AGENDADA, StatusEtapa.RASCUNHO):
        raise HTTPException(
            status_code=409,
            detail=f"Etapa indisponível para inscrição (status={etapa.status.value}).",
        )

    ja_existe = (
        sessao.query(Agendamento)
        .filter(
            Agendamento.aluno_id == aluno_id,
            Agendamento.etapa_id == req.etapa_id,
            Agendamento.status.in_(
                [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO],
            ),
        )
        .first()
    )
    if ja_existe:
        raise HTTPException(status_code=409, detail="Já existe inscrição ativa.")

    novo = Agendamento(
        aluno_id=aluno_id,
        etapa_id=req.etapa_id,
        status=StatusAgendamento.AGENDADO,
        observacoes=req.observacoes,
    )
    sessao.add(novo)
    sessao.commit()
    sessao.refresh(novo)
    return _serializar_agendamento(novo)


@router.delete("/agendamentos/{agendamento_id}")
def cancelar_agendamento(
    agendamento_id: int, sessao: Session = Depends(get_session),
) -> dict:
    """🔵 supletivo apenas."""
    ag = sessao.get(Agendamento, agendamento_id)
    if not ag:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    exigir_vinculo(ag.aluno, VinculoAluno.SUPLETIVO)

    if ag.status in (StatusAgendamento.REALIZADO, StatusAgendamento.FALTOU):
        raise HTTPException(
            status_code=409,
            detail="Não cancela agendamento já realizado ou com falta.",
        )
    ag.status = StatusAgendamento.CANCELADO
    sessao.commit()
    sessao.refresh(ag)
    return _serializar_agendamento(ag)


def _serializar_agendamento(a: Agendamento) -> dict:
    return {
        "id": a.id,
        "aluno_id": a.aluno_id,
        "etapa_id": a.etapa_id,
        "status": a.status.value,
        "observacoes": a.observacoes,
        "agendado_em": a.agendado_em.isoformat(),
        "confirmado_em": a.confirmado_em.isoformat() if a.confirmado_em else None,
        "realizado_em": a.realizado_em.isoformat() if a.realizado_em else None,
    }


# ============================================================================
# EDITAIS — 🔵 supletivo apenas
# ============================================================================


@router.get("/{aluno_id}/editais")
def listar_editais(aluno_id: int, sessao: Session = Depends(get_session)) -> dict:
    aluno = _carregar_aluno(sessao, aluno_id)
    exigir_vinculo(aluno, VinculoAluno.SUPLETIVO)

    hoje = date.today()
    vigentes = (
        sessao.query(Edital)
        .filter(
            Edital.vigencia_inicio <= hoje,
            Edital.vigencia_fim >= hoje,
            Edital.publico_alvo == VinculoAluno.SUPLETIVO,
        )
        .all()
    )
    return {
        "vinculo": "supletivo",
        "total": len(vigentes),
        "dados": [
            {
                "id": e.id,
                "nome": e.nome,
                "ano": e.ano,
                "banca": e.banca,
                "vigencia_inicio": e.vigencia_inicio.isoformat(),
                "vigencia_fim": e.vigencia_fim.isoformat(),
                "inscrito": e.id == aluno.edital_id,
            }
            for e in vigentes
        ],
    }


# ============================================================================
# RESULTADOS — 🔵🔴
# ============================================================================


@router.get("/{aluno_id}/resultados")
def resultados(aluno_id: int, sessao: Session = Depends(get_session)) -> dict:
    aluno = _carregar_aluno(sessao, aluno_id)
    respostas = sessao.query(Resposta).filter(Resposta.aluno_id == aluno_id).all()
    por_simulado: dict[int, list[Resposta]] = {}
    for r in respostas:
        por_simulado.setdefault(r.simulado_id, []).append(r)

    saida = []
    for sim_id, lista in por_simulado.items():
        simulado = sessao.get(Simulado, sim_id)
        acertos = sum(1 for r in lista if r.correta)
        total = len(lista)
        saida.append(
            {
                "simulado_id": sim_id,
                "simulado_titulo": simulado.titulo if simulado else "Simulado",
                "acertos": acertos,
                "erros": total - acertos,
                "total": total,
                "nota": round(acertos / total * 10, 2) if total else 0,
            },
        )
    nota_media = sum(s["nota"] for s in saida) / len(saida) if saida else 0
    return {
        "vinculo": obter_vinculo(aluno).value,
        "total": len(saida),
        "nota_media": round(nota_media, 2),
        "resultados": saida,
    }


# ============================================================================
# GUIA DE ESTUDOS — 🔵🔴
# ============================================================================


@router.get("/{aluno_id}/guia-estudos")
def guia_de_estudos(
    aluno_id: int,
    baseado_em_simulado_id: int | None = None,
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = _carregar_aluno(sessao, aluno_id)

    # busca respostas e calcula taxa de acerto por matéria → identifica fracos
    q = sessao.query(Resposta).filter(Resposta.aluno_id == aluno_id)
    if baseado_em_simulado_id:
        q = q.filter(Resposta.simulado_id == baseado_em_simulado_id)
    respostas = q.all()

    if not respostas:
        return {
            "vinculo": obter_vinculo(aluno).value,
            "recomendacao": "Sem histórico de respostas — faça uma diagnóstica para gerar o guia.",
            "assuntos": [],
        }

    por_materia: dict[int, list[Resposta]] = {}
    for r in respostas:
        questao = r.questao
        if not questao:
            continue
        por_materia.setdefault(questao.materia_id, []).append(r)

    materias_fracas = []
    materias_fortes = []
    for materia_id, lista in por_materia.items():
        acerto = sum(1 for r in lista if r.correta) / len(lista)
        if acerto < 0.6:
            materias_fracas.append(materia_id)
        elif acerto >= 0.8:
            materias_fortes.append(materia_id)

    assuntos_sugeridos = (
        sessao.query(AssuntoEstudo)
        .filter(AssuntoEstudo.materia_id.in_(materias_fracas))
        .limit(5)
        .all()
        if materias_fracas
        else []
    )

    horas = sum(
        sum((rec.duracao_min or 30) for rec in a.recursos) / 60.0
        for a in assuntos_sugeridos
    )

    guia = GuiaEstudo(
        aluno_id=aluno_id,
        gerado_a_partir_simulado_id=baseado_em_simulado_id,
        assunto_ids=[a.id for a in assuntos_sugeridos],
        pontos_fortes=[str(m) for m in materias_fortes],
        pontos_fracos=[str(m) for m in materias_fracas],
        recomendacao=(
            "Bom desempenho geral! Mantenha o ritmo."
            if not materias_fracas
            else f"Foque nos {len(assuntos_sugeridos)} assuntos abaixo. "
                 f"Estimativa de {int(max(1, horas))}h de estudo."
        ),
        horas_estimadas=int(max(1, horas)) if materias_fracas else 0,
    )
    sessao.add(guia)
    sessao.commit()
    sessao.refresh(guia)

    return {
        "vinculo": obter_vinculo(aluno).value,
        "guia": {
            "id": guia.id,
            "pontos_fortes": guia.pontos_fortes,
            "pontos_fracos": guia.pontos_fracos,
            "recomendacao": guia.recomendacao,
            "horas_estimadas": guia.horas_estimadas,
            "gerado_em": guia.gerado_em.isoformat(),
        },
        "assuntos": [
            {
                "id": a.id,
                "titulo": a.titulo,
                "topicos": a.topicos,
                "prioridade": a.prioridade.value,
            }
            for a in assuntos_sugeridos
        ],
    }


# ============================================================================
# SIMULADO PRA ESTUDO — 🔵 supletivo apenas
# ============================================================================


class SimuladoEstudoRequest(BaseModel):
    materia_ids: list[int] = []
    quantidade: int = Field(10, ge=5, le=30)
    nivel_id: int | None = None
    baseado_em_simulado_id: int | None = None


@router.post("/{aluno_id}/simulado-estudo", status_code=201)
def gerar_simulado_estudo(
    aluno_id: int,
    req: SimuladoEstudoRequest,
    sessao: Session = Depends(get_session),
) -> dict:
    """🔵 supletivo apenas — gera lista de questões pra estudar."""
    aluno = _carregar_aluno(sessao, aluno_id)
    exigir_vinculo(aluno, VinculoAluno.SUPLETIVO)

    from app.models import Questao  # local pra evitar ciclo

    q = sessao.query(Questao)
    if req.materia_ids:
        q = q.filter(Questao.materia_id.in_(req.materia_ids))
    if req.nivel_id:
        q = q.filter(Questao.nivel_id == req.nivel_id)
    questoes = q.limit(req.quantidade).all()
    if not questoes:
        raise HTTPException(
            status_code=409,
            detail="Não foi possível encontrar questões para os filtros.",
        )

    return {
        "id": f"sed_{int(datetime.utcnow().timestamp())}",
        "aluno_id": aluno_id,
        "titulo": "Simulado de estudo personalizado",
        "materia_ids": req.materia_ids,
        "quantidade": len(questoes),
        "questao_ids": [qst.id for qst in questoes],
        "criado_em": datetime.utcnow().isoformat(),
    }
