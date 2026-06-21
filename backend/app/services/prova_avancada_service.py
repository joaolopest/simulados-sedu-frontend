from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.enums import StatusQuestao
from app.models import (
    Aluno,
    Alternativa,
    Notificacao,
    Questao,
    Resposta,
    ResultadoSimulado,
    Simulado,
    SimuladoInscricao,
    SimuladoSnapshot,
    SimuladoTentativa,
    Usuario,
)


STATUS_TENTATIVA_NAO_INICIADO = "nao_iniciado"
STATUS_TENTATIVA_EM_ANDAMENTO = "em_andamento"
STATUS_TENTATIVA_FINALIZADA = "finalizada"
STATUS_TENTATIVA_REABERTA = "reaberta"
STATUS_TENTATIVA_CANCELADA = "cancelada"


def _alternativas_snapshot(questao: Questao) -> list[dict]:
    alternativas = sorted(
        list(questao.alternativas or []),
        key=lambda a: (a.ordem_original, a.id),
    )
    return [
        {
            "id": alt.id,
            "texto": alt.texto,
            "correta": bool(alt.correta),
            "ordemOriginal": alt.ordem_original,
        }
        for alt in alternativas
    ]


def _questao_snapshot(ordem: int, questao: Questao) -> dict:
    return {
        "ordem": ordem,
        "questaoId": questao.id,
        "enunciado": questao.enunciado,
        "imagemUrl": questao.imagem_url,
        "serie": questao.serie.nome if questao.serie else None,
        "materia": questao.materia.nome if questao.materia else None,
        "conteudo": questao.conteudo.nome if questao.conteudo else None,
        "nivel": questao.nivel.nome if questao.nivel else None,
        "status": questao.status.value if questao.status else None,
        "competencias": questao.competencias or [],
        "explicacao": questao.explicacao,
        "versao": questao.versao,
        "alternativas": _alternativas_snapshot(questao),
    }


def montar_questoes_snapshot(simulado: Simulado) -> list[dict]:
    itens = sorted(simulado.questoes, key=lambda sq: sq.ordem_questao)
    return [
        _questao_snapshot(indice, sq.questao)
        for indice, sq in enumerate(itens, start=1)
        if sq.questao is not None
    ]


def validar_simulado(simulado: Simulado) -> dict:
    bloqueios: list[dict] = []
    avisos: list[dict] = []
    vistos: set[int] = set()
    questoes = sorted(simulado.questoes, key=lambda sq: sq.ordem_questao)

    if not questoes:
        bloqueios.append(
            {
                "codigo": "SEM_QUESTOES",
                "mensagem": "A prova precisa ter pelo menos uma questao.",
            }
        )

    for indice, sq in enumerate(questoes, start=1):
        questao = sq.questao
        contexto = {"ordem": indice, "questaoId": sq.questao_id}
        if questao is None:
            bloqueios.append(
                {
                    **contexto,
                    "codigo": "QUESTAO_INEXISTENTE",
                    "mensagem": "A prova referencia uma questao inexistente.",
                }
            )
            continue
        if questao.id in vistos:
            bloqueios.append(
                {
                    **contexto,
                    "codigo": "QUESTAO_DUPLICADA",
                    "mensagem": "A mesma questao aparece mais de uma vez na prova.",
                }
            )
        vistos.add(questao.id)
        if questao.status == StatusQuestao.ARQUIVADA:
            bloqueios.append(
                {
                    **contexto,
                    "codigo": "QUESTAO_ARQUIVADA",
                    "mensagem": "Questao arquivada nao pode ser liberada em prova.",
                }
            )
        alternativas = list(questao.alternativas or [])
        if len(alternativas) < 2:
            bloqueios.append(
                {
                    **contexto,
                    "codigo": "ALTERNATIVAS_INSUFICIENTES",
                    "mensagem": "A questao precisa ter ao menos duas alternativas.",
                }
            )
        corretas = sum(1 for alt in alternativas if alt.correta)
        if corretas != 1:
            bloqueios.append(
                {
                    **contexto,
                    "codigo": "GABARITO_INVALIDO",
                    "mensagem": "A questao precisa ter exatamente uma alternativa correta.",
                }
            )
        if questao.imagem_url and not str(questao.imagem_url).startswith(("http://", "https://", "/")):
            avisos.append(
                {
                    **contexto,
                    "codigo": "IMAGEM_URL_SUSPEITA",
                    "mensagem": "A questao tem imagem com URL em formato incomum.",
                }
            )

    return {
        "ok": not bloqueios,
        "totalQuestoes": len(questoes),
        "bloqueios": bloqueios,
        "avisos": avisos,
    }


def snapshot_mais_recente(sessao: Session, simulado_id: int) -> SimuladoSnapshot | None:
    return sessao.scalar(
        select(SimuladoSnapshot)
        .where(SimuladoSnapshot.simulado_id == simulado_id)
        .order_by(SimuladoSnapshot.versao.desc())
        .limit(1)
    )


def criar_ou_obter_snapshot(
    sessao: Session,
    *,
    simulado: Simulado,
    usuario: Usuario | None,
    forcar_novo: bool = False,
) -> SimuladoSnapshot:
    questoes_json = montar_questoes_snapshot(simulado)
    parametros = simulado.parametros_json or {}
    ultimo = snapshot_mais_recente(sessao, simulado.id)
    if (
        ultimo is not None
        and not forcar_novo
        and ultimo.questoes_json == questoes_json
        and ultimo.parametros_json == parametros
    ):
        return ultimo

    prox_versao = 1
    if ultimo is not None:
        prox_versao = ultimo.versao + 1
    snapshot = SimuladoSnapshot(
        simulado_id=simulado.id,
        versao=prox_versao,
        titulo=simulado.titulo,
        parametros_json=parametros,
        questoes_json=questoes_json,
        total_questoes=len(questoes_json),
        criado_por_id=usuario.id if usuario else None,
    )
    sessao.add(snapshot)
    sessao.flush()
    return snapshot


def tentativa_mais_recente(
    sessao: Session,
    *,
    simulado_id: int,
    aluno_id: int,
) -> SimuladoTentativa | None:
    return sessao.scalar(
        select(SimuladoTentativa)
        .where(
            SimuladoTentativa.simulado_id == simulado_id,
            SimuladoTentativa.aluno_id == aluno_id,
        )
        .order_by(SimuladoTentativa.numero.desc())
        .limit(1)
    )


def tentativa_ativa(
    sessao: Session,
    *,
    simulado_id: int,
    aluno_id: int,
) -> SimuladoTentativa | None:
    tentativa = tentativa_mais_recente(sessao, simulado_id=simulado_id, aluno_id=aluno_id)
    if tentativa is None:
        return None
    if tentativa.status in (STATUS_TENTATIVA_FINALIZADA, STATUS_TENTATIVA_CANCELADA):
        return None
    return tentativa


def obter_ou_criar_tentativa(
    sessao: Session,
    *,
    simulado: Simulado,
    aluno: Aluno,
) -> SimuladoTentativa:
    existente = tentativa_ativa(sessao, simulado_id=simulado.id, aluno_id=aluno.id)
    if existente is not None:
        return existente

    ultima = tentativa_mais_recente(sessao, simulado_id=simulado.id, aluno_id=aluno.id)
    numero = 1 if ultima is None else ultima.numero + 1
    snapshot = snapshot_mais_recente(sessao, simulado.id)
    agora = datetime.now(timezone.utc)
    tentativa = SimuladoTentativa(
        simulado_id=simulado.id,
        aluno_id=aluno.id,
        snapshot_id=snapshot.id if snapshot else None,
        numero=numero,
        status=STATUS_TENTATIVA_NAO_INICIADO,
        ultima_atividade_em=agora,
    )
    sessao.add(tentativa)
    sessao.flush()
    return tentativa


def marcar_tentativa_iniciada(tentativa: SimuladoTentativa) -> None:
    agora = datetime.now(timezone.utc)
    if tentativa.iniciado_em is None:
        tentativa.iniciado_em = agora
    tentativa.status = STATUS_TENTATIVA_EM_ANDAMENTO
    tentativa.ultima_atividade_em = agora


def marcar_tentativa_finalizada(
    tentativa: SimuladoTentativa,
    *,
    tempo_total_segundos: int,
) -> None:
    agora = datetime.now(timezone.utc)
    tentativa.status = STATUS_TENTATIVA_FINALIZADA
    tentativa.finalizado_em = agora
    tentativa.ultima_atividade_em = agora
    tentativa.tempo_total_segundos = tempo_total_segundos


def resultado_persistido(
    sessao: Session,
    *,
    simulado_id: int,
    aluno_id: int,
) -> ResultadoSimulado | None:
    return sessao.scalar(
        select(ResultadoSimulado)
        .where(
            ResultadoSimulado.simulado_id == simulado_id,
            ResultadoSimulado.aluno_id == aluno_id,
        )
        .order_by(ResultadoSimulado.criado_em.desc())
        .limit(1)
    )


def salvar_resultado(
    sessao: Session,
    *,
    tentativa: SimuladoTentativa,
    resultado: dict,
) -> ResultadoSimulado:
    existente = sessao.scalar(
        select(ResultadoSimulado).where(ResultadoSimulado.tentativa_id == tentativa.id)
    )
    dados = {
        "simulado_id": tentativa.simulado_id,
        "aluno_id": tentativa.aluno_id,
        "tentativa_id": tentativa.id,
        "snapshot_id": tentativa.snapshot_id,
        "nota_final": float(resultado.get("notaFinal") or 0),
        "preenchidas": int(resultado.get("preenchidas") or 0),
        "acertos": int(resultado.get("acertos") or 0),
        "erros": int(resultado.get("erros") or 0),
        "em_branco": int(resultado.get("emBranco") or 0),
        "tempo_total_segundos": int(resultado.get("tempoTotalSegundos") or 0),
        "resultado_json": resultado,
    }
    if existente is None:
        existente = ResultadoSimulado(**dados)
        sessao.add(existente)
    else:
        for chave, valor in dados.items():
            setattr(existente, chave, valor)
    sessao.flush()
    return existente


def reabrir_para_aluno(
    sessao: Session,
    *,
    simulado: Simulado,
    aluno: Aluno,
    usuario: Usuario,
    motivo: str,
) -> SimuladoTentativa:
    ultima = tentativa_mais_recente(sessao, simulado_id=simulado.id, aluno_id=aluno.id)
    numero = 1 if ultima is None else ultima.numero + 1
    if ultima is not None and ultima.status != STATUS_TENTATIVA_FINALIZADA:
        ultima.status = STATUS_TENTATIVA_REABERTA
        ultima.reaberto_em = datetime.now(timezone.utc)
        ultima.reaberto_por_id = usuario.id
        ultima.motivo_reabertura = motivo

    sessao.query(Resposta).filter(
        Resposta.simulado_id == simulado.id,
        Resposta.aluno_id == aluno.id,
    ).delete(synchronize_session=False)

    inscricao = sessao.scalar(
        select(SimuladoInscricao).where(
            SimuladoInscricao.simulado_id == simulado.id,
            SimuladoInscricao.aluno_id == aluno.id,
        )
    )
    if inscricao is None:
        inscricao = SimuladoInscricao(
            simulado_id=simulado.id,
            aluno_id=aluno.id,
            inscrito_por_id=usuario.id,
            status="inscrito",
        )
        sessao.add(inscricao)
    else:
        inscricao.status = "inscrito"
        inscricao.inscrito_por_id = usuario.id
        inscricao.inscrito_em = datetime.now(timezone.utc)

    snapshot = snapshot_mais_recente(sessao, simulado.id)
    nova = SimuladoTentativa(
        simulado_id=simulado.id,
        aluno_id=aluno.id,
        snapshot_id=snapshot.id if snapshot else None,
        numero=numero,
        status=STATUS_TENTATIVA_NAO_INICIADO,
        reaberto_em=datetime.now(timezone.utc),
        reaberto_por_id=usuario.id,
        motivo_reabertura=motivo,
    )
    sessao.add(nova)
    sessao.flush()
    return nova


def notificar(
    sessao: Session,
    *,
    destinatarios: Iterable[Usuario],
    tipo: str,
    titulo: str,
    mensagem: str,
    origem_id: str | None = None,
    origem_tipo: str | None = None,
    acao_url: str | None = None,
    acao_label: str | None = None,
) -> int:
    total = 0
    for destinatario in destinatarios:
        sessao.add(
            Notificacao(
                tipo=tipo,
                titulo=titulo,
                mensagem=mensagem,
                destinatario_id=destinatario.id,
                origem_id=origem_id,
                origem_tipo=origem_tipo,
                acao_url=acao_url,
                acao_label=acao_label,
            )
        )
        total += 1
    return total


def total_respostas_simulado(sessao: Session, simulado_id: int) -> int:
    return (
        sessao.scalar(select(func.count(Resposta.id)).where(Resposta.simulado_id == simulado_id))
        or 0
    )
