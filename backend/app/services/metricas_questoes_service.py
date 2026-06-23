from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.models import Alternativa, Questao, Resposta, Simulado, SimuladoQuestao


def metricas_por_questoes(sessao: Session, questoes: list[Questao]) -> dict[int, dict]:
    ids = [q.id for q in questoes]
    if not ids:
        return {}

    alternativas = _alternativas(sessao, ids)
    respostas = _respostas(sessao, ids)
    usos = _usos(sessao, ids)
    escolhas = _escolhas_por_alternativa(sessao, ids)

    saida: dict[int, dict] = {}
    for questao in questoes:
        qid = questao.id
        alt = alternativas.get(qid, {"total": 0, "corretas": 0})
        resp = respostas.get(qid, _respostas_vazias())
        uso = usos.get(qid, {"total": 0, "recentes": 0})
        escolha = escolhas.get(qid, {})
        alertas = _alertas(questao, alt, resp, uso, escolha)
        total_respostas = resp["totalRespostas"]
        saida[qid] = {
            "questao_id": qid,
            "total_usos": uso["total"],
            "usos_recentes": uso["recentes"],
            "total_respostas": total_respostas,
            "preenchidas": resp["preenchidas"],
            "acertos": resp["acertos"],
            "erros": resp["erros"],
            "em_branco": resp["emBranco"],
            "taxa_acerto": _taxa(resp["acertos"], total_respostas),
            "taxa_erro": _taxa(resp["erros"], total_respostas),
            "taxa_branco": _taxa(resp["emBranco"], total_respostas),
            "tempo_medio_segundos": resp["tempoMedioSegundos"],
            "usada_recentemente": uso["recentes"] > 0,
            "alternativas_total": alt["total"],
            "alternativas_corretas": alt["corretas"],
            "alertas": alertas,
        }
    return saida


def _taxa(valor: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round(valor / total, 4)


def _respostas_vazias() -> dict:
    return {
        "totalRespostas": 0,
        "preenchidas": 0,
        "acertos": 0,
        "erros": 0,
        "emBranco": 0,
        "tempoMedioSegundos": 0,
    }


def _alternativas(sessao: Session, ids: list[int]) -> dict[int, dict]:
    linhas = sessao.execute(
        select(
            Alternativa.questao_id,
            func.count(Alternativa.id),
            func.sum(case((Alternativa.correta.is_(True), 1), else_=0)),
        )
        .where(Alternativa.questao_id.in_(ids))
        .group_by(Alternativa.questao_id)
    ).all()
    return {
        int(qid): {"total": int(total or 0), "corretas": int(corretas or 0)}
        for qid, total, corretas in linhas
    }


def _respostas(sessao: Session, ids: list[int]) -> dict[int, dict]:
    preenchida = and_(Resposta.alternativa_id.is_not(None), Resposta.status == "respondida")
    linhas = sessao.execute(
        select(
            Resposta.questao_id,
            func.count(Resposta.id).label("total"),
            func.sum(case((preenchida, 1), else_=0)).label("preenchidas"),
            func.sum(case((Resposta.correta.is_(True), 1), else_=0)).label("acertos"),
            func.sum(
                case(
                    (
                        and_(
                            Resposta.alternativa_id.is_not(None),
                            Resposta.correta.is_(False),
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("erros"),
            func.sum(
                case(
                    (
                        (Resposta.alternativa_id.is_(None)) | (Resposta.status == "em_branco"),
                        1,
                    ),
                    else_=0,
                )
            ).label("brancos"),
            func.avg(
                case(
                    (Resposta.tempo_gasto_segundos > 0, Resposta.tempo_gasto_segundos),
                    else_=None,
                )
            ).label("tempo_medio"),
        )
        .where(Resposta.questao_id.in_(ids))
        .group_by(Resposta.questao_id)
    ).all()
    return {
        int(qid): {
            "totalRespostas": int(total or 0),
            "preenchidas": int(preenchidas or 0),
            "acertos": int(acertos or 0),
            "erros": int(erros or 0),
            "emBranco": int(brancos or 0),
            "tempoMedioSegundos": int(round(float(tempo_medio or 0))),
        }
        for qid, total, preenchidas, acertos, erros, brancos, tempo_medio in linhas
    }


def _usos(sessao: Session, ids: list[int]) -> dict[int, dict]:
    limite_recente = datetime.now(timezone.utc) - timedelta(days=60)
    linhas = sessao.execute(
        select(
            SimuladoQuestao.questao_id,
            func.count(SimuladoQuestao.id),
            func.sum(case((Simulado.criado_em >= limite_recente, 1), else_=0)),
        )
        .join(Simulado, Simulado.id == SimuladoQuestao.simulado_id)
        .where(SimuladoQuestao.questao_id.in_(ids))
        .group_by(SimuladoQuestao.questao_id)
    ).all()
    return {
        int(qid): {"total": int(total or 0), "recentes": int(recentes or 0)}
        for qid, total, recentes in linhas
    }


def _escolhas_por_alternativa(sessao: Session, ids: list[int]) -> dict[int, dict[int, int]]:
    linhas = sessao.execute(
        select(
            Alternativa.questao_id,
            Alternativa.id,
            func.count(Resposta.id),
        )
        .outerjoin(Resposta, Resposta.alternativa_id == Alternativa.id)
        .where(Alternativa.questao_id.in_(ids), Alternativa.correta.is_(False))
        .group_by(Alternativa.questao_id, Alternativa.id)
    ).all()
    dados: dict[int, dict[int, int]] = {}
    for qid, alt_id, total in linhas:
        dados.setdefault(int(qid), {})[int(alt_id)] = int(total or 0)
    return dados


def _alertas(
    questao: Questao,
    alternativas: dict,
    respostas: dict,
    usos: dict,
    escolhas: dict[int, int],
) -> list[str]:
    alertas: list[str] = []
    total_respostas = respostas["totalRespostas"]
    if alternativas["total"] < 2:
        alertas.append("alternativas_insuficientes")
    if alternativas["corretas"] != 1:
        alertas.append("gabarito_invalido")
    if usos["total"] == 0:
        alertas.append("nunca_usada")
    if total_respostas == 0:
        alertas.append("sem_respostas")
    if total_respostas >= 10 and respostas["acertos"] / total_respostas < 0.35:
        alertas.append("baixa_taxa_acerto")
    if total_respostas >= 10 and respostas["acertos"] / total_respostas > 0.9:
        alertas.append("alta_taxa_acerto")
    if total_respostas >= 10 and respostas["emBranco"] / total_respostas > 0.25:
        alertas.append("muitos_brancos")
    tempo_estimado = int(questao.tempo_estimado_segundos or 0)
    if (
        total_respostas >= 5
        and tempo_estimado > 0
        and respostas["tempoMedioSegundos"] > tempo_estimado * 1.5
    ):
        alertas.append("tempo_medio_alto")
    if total_respostas >= 10 and any(total == 0 for total in escolhas.values()):
        alertas.append("distrator_nunca_escolhido")
    imagem = str(questao.imagem_url or "").strip()
    if imagem and not imagem.startswith(("http://", "https://", "/")):
        alertas.append("imagem_url_suspeita")
    return alertas
