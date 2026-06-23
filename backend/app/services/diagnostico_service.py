from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse

from sqlalchemy import case, exists, func, or_, select
from sqlalchemy.orm import Session

from app.database import DATABASE_URL, engine
from app.enums import StatusQuestao, StatusSimulado
from app.models import (
    AcaoAuditoria,
    Aluno,
    Alternativa,
    ConfiguracaoSistema,
    Escola,
    Notificacao,
    Questao,
    Resposta,
    ResultadoSimulado,
    RevisaoQuestao,
    Simulado,
    SimuladoInscricao,
    SimuladoQuestao,
    SimuladoSnapshot,
    SimuladoTentativa,
    Turma,
    Usuario,
)

CONFIGS_OBRIGATORIAS = {"provas", "acessibilidade", "resultados"}


def gerar_diagnostico(sessao: Session) -> dict:
    contagens = _contagens(sessao)
    ambiente = _ambiente()
    integridade = _integridade(sessao)
    configuracoes = _configuracoes(sessao)
    pendencias = _pendencias(contagens, integridade, configuracoes)

    status = "ok"
    if pendencias["criticas"]:
        status = "critico"
    elif pendencias["avisos"]:
        status = "atencao"

    return {
        "status": status,
        "checadoEm": datetime.now(timezone.utc).isoformat(),
        "ambiente": ambiente,
        "contagens": contagens,
        "configuracoes": configuracoes,
        "integridade": integridade,
        "pendencias": pendencias,
        "recomendacoes": _recomendacoes(status, integridade, configuracoes),
    }


def reparar_snapshots_liberados(sessao: Session, usuario: Usuario) -> dict:
    from app.services import prova_avancada_service

    simulados = sessao.scalars(
        select(Simulado)
        .where(
            Simulado.status == StatusSimulado.LIBERADO,
            ~exists(
                select(SimuladoSnapshot.id).where(
                    SimuladoSnapshot.simulado_id == Simulado.id
                )
            ),
        )
        .order_by(Simulado.id.asc())
    ).all()

    reparados = []
    ignorados = []
    for simulado in simulados:
        if not simulado.questoes:
            ignorados.append(
                {
                    "simuladoId": str(simulado.id),
                    "motivo": "Prova liberada sem questoes vinculadas.",
                }
            )
            continue
        snapshot = prova_avancada_service.criar_ou_obter_snapshot(
            sessao,
            simulado=simulado,
            usuario=usuario,
        )
        reparados.append(
            {
                "simuladoId": str(simulado.id),
                "snapshotId": str(snapshot.id),
                "versao": snapshot.versao,
                "totalQuestoes": snapshot.total_questoes,
            }
        )

    return {
        "ok": True,
        "totalReparados": len(reparados),
        "totalIgnorados": len(ignorados),
        "reparados": reparados,
        "ignorados": ignorados,
    }


def _contar(sessao: Session, modelo) -> int:
    return int(sessao.scalar(select(func.count(modelo.id))) or 0)


def _contagens(sessao: Session) -> dict:
    usuarios_ativos = sessao.scalar(
        select(func.count(Usuario.id)).where(Usuario.ativo.is_(True))
    )
    questoes_publicadas = sessao.scalar(
        select(func.count(Questao.id)).where(Questao.status == StatusQuestao.PUBLICADA)
    )
    provas_liberadas = sessao.scalar(
        select(func.count(Simulado.id)).where(Simulado.status == StatusSimulado.LIBERADO)
    )
    notificacoes_nao_lidas = sessao.scalar(
        select(func.count(Notificacao.id)).where(Notificacao.lida.is_(False))
    )
    revisoes_pendentes = sessao.scalar(
        select(func.count(RevisaoQuestao.id)).where(RevisaoQuestao.status == "pendente")
    )
    return {
        "usuarios": _contar(sessao, Usuario),
        "usuariosAtivos": int(usuarios_ativos or 0),
        "alunos": _contar(sessao, Aluno),
        "escolas": _contar(sessao, Escola),
        "turmas": _contar(sessao, Turma),
        "questoes": _contar(sessao, Questao),
        "questoesPublicadas": int(questoes_publicadas or 0),
        "alternativas": _contar(sessao, Alternativa),
        "provas": _contar(sessao, Simulado),
        "provasLiberadas": int(provas_liberadas or 0),
        "inscricoes": _contar(sessao, SimuladoInscricao),
        "tentativas": _contar(sessao, SimuladoTentativa),
        "resultados": _contar(sessao, ResultadoSimulado),
        "respostas": _contar(sessao, Resposta),
        "notificacoesNaoLidas": int(notificacoes_nao_lidas or 0),
        "acoesAuditoria": _contar(sessao, AcaoAuditoria),
        "revisoesPendentes": int(revisoes_pendentes or 0),
    }


def _ambiente() -> dict:
    url = urlparse(DATABASE_URL)
    host = url.hostname or ""
    tipo = "externo"
    if "supabase" in host:
        tipo = "supabase"
    elif host in {"localhost", "127.0.0.1", "db"}:
        tipo = "docker_local"
    return {
        "tipoBanco": tipo,
        "dialeto": engine.dialect.name,
        "hostClassificado": tipo,
        "driver": engine.driver,
    }


def _integridade(sessao: Session) -> dict:
    alt_stats = (
        select(
            Alternativa.questao_id.label("questao_id"),
            func.count(Alternativa.id).label("total"),
            func.sum(case((Alternativa.correta.is_(True), 1), else_=0)).label("corretas"),
        )
        .group_by(Alternativa.questao_id)
        .subquery()
    )
    q_ativas = Questao.status != StatusQuestao.ARQUIVADA
    questoes_sem_alternativas = sessao.scalar(
        select(func.count(Questao.id))
        .outerjoin(alt_stats, alt_stats.c.questao_id == Questao.id)
        .where(q_ativas, func.coalesce(alt_stats.c.total, 0) < 2)
    )
    questoes_gabarito_invalido = sessao.scalar(
        select(func.count(Questao.id))
        .outerjoin(alt_stats, alt_stats.c.questao_id == Questao.id)
        .where(q_ativas, func.coalesce(alt_stats.c.corretas, 0) != 1)
    )

    simulado_questoes = (
        select(
            SimuladoQuestao.simulado_id.label("simulado_id"),
            func.count(SimuladoQuestao.id).label("total"),
        )
        .group_by(SimuladoQuestao.simulado_id)
        .subquery()
    )
    simulados_sem_questoes = sessao.scalar(
        select(func.count(Simulado.id))
        .outerjoin(simulado_questoes, simulado_questoes.c.simulado_id == Simulado.id)
        .where(
            Simulado.status != StatusSimulado.CANCELADO,
            func.coalesce(simulado_questoes.c.total, 0) == 0,
        )
    )
    liberadas_sem_snapshot = sessao.scalar(
        select(func.count(Simulado.id)).where(
            Simulado.status == StatusSimulado.LIBERADO,
            ~exists(
                select(SimuladoSnapshot.id).where(
                    SimuladoSnapshot.simulado_id == Simulado.id
                )
            ),
        )
    )

    alunos_por_turma = (
        select(Aluno.turma_id.label("turma_id"), func.count(Aluno.id).label("total"))
        .where(Aluno.turma_id.is_not(None))
        .group_by(Aluno.turma_id)
        .subquery()
    )
    provas_liberadas_turma_vazia = sessao.scalar(
        select(func.count(Simulado.id))
        .outerjoin(alunos_por_turma, alunos_por_turma.c.turma_id == Simulado.turma_id)
        .where(
            Simulado.status == StatusSimulado.LIBERADO,
            func.coalesce(alunos_por_turma.c.total, 0) == 0,
        )
    )

    tentativas_finalizadas_sem_resultado = sessao.scalar(
        select(func.count(SimuladoTentativa.id)).where(
            SimuladoTentativa.status == "finalizada",
            ~exists(
                select(ResultadoSimulado.id).where(
                    ResultadoSimulado.tentativa_id == SimuladoTentativa.id
                )
            ),
        )
    )
    resultados_inconsistentes = sessao.scalar(
        select(func.count(ResultadoSimulado.id)).where(
            or_(
                ResultadoSimulado.preenchidas
                != ResultadoSimulado.acertos + ResultadoSimulado.erros,
                ResultadoSimulado.preenchidas < 0,
                ResultadoSimulado.acertos < 0,
                ResultadoSimulado.erros < 0,
                ResultadoSimulado.em_branco < 0,
                ResultadoSimulado.tempo_total_segundos < 0,
            )
        )
    )
    respostas_sem_tentativa = sessao.scalar(
        select(func.count(Resposta.id)).where(Resposta.tentativa_id.is_(None))
    )

    return {
        "questoesSemAlternativasSuficientes": int(questoes_sem_alternativas or 0),
        "questoesComGabaritoInvalido": int(questoes_gabarito_invalido or 0),
        "provasSemQuestoes": int(simulados_sem_questoes or 0),
        "provasLiberadasSemSnapshot": int(liberadas_sem_snapshot or 0),
        "provasLiberadasComTurmaVazia": int(provas_liberadas_turma_vazia or 0),
        "tentativasFinalizadasSemResultado": int(tentativas_finalizadas_sem_resultado or 0),
        "resultadosInconsistentes": int(resultados_inconsistentes or 0),
        "respostasSemTentativa": int(respostas_sem_tentativa or 0),
    }


def _configuracoes(sessao: Session) -> dict:
    existentes = {
        chave
        for chave in sessao.scalars(select(ConfiguracaoSistema.chave)).all()
        if chave
    }
    faltantes = sorted(CONFIGS_OBRIGATORIAS - existentes)
    return {
        "obrigatorias": sorted(CONFIGS_OBRIGATORIAS),
        "faltantes": faltantes,
        "ok": not faltantes,
    }


def _pendencias(contagens: dict, integridade: dict, configuracoes: dict) -> dict:
    criticas: list[dict] = []
    avisos: list[dict] = []

    minimos = {
        "usuarios": "Nenhum usuario cadastrado.",
        "escolas": "Nenhuma escola cadastrada.",
        "turmas": "Nenhuma turma cadastrada.",
        "questoes": "Nenhuma questao cadastrada.",
        "provas": "Nenhuma prova cadastrada.",
    }
    for chave, mensagem in minimos.items():
        if contagens.get(chave, 0) == 0:
            criticas.append({"codigo": f"SEM_{chave.upper()}", "mensagem": mensagem})

    for chave in configuracoes["faltantes"]:
        criticas.append(
            {
                "codigo": "CONFIGURACAO_OBRIGATORIA_AUSENTE",
                "mensagem": f"Configuracao obrigatoria ausente: {chave}.",
            }
        )

    checks_criticos = {
        "questoesSemAlternativasSuficientes": "Questoes ativas sem alternativas suficientes.",
        "questoesComGabaritoInvalido": "Questoes ativas com gabarito invalido.",
        "provasLiberadasSemSnapshot": "Provas liberadas sem snapshot congelado.",
        "tentativasFinalizadasSemResultado": "Tentativas finalizadas sem resultado persistido.",
        "resultadosInconsistentes": "Resultados com contagens inconsistentes.",
    }
    for chave, mensagem in checks_criticos.items():
        total = int(integridade.get(chave, 0))
        if total:
            criticas.append({"codigo": chave, "mensagem": mensagem, "total": total})

    checks_aviso = {
        "provasSemQuestoes": "Provas ainda sem questoes.",
        "provasLiberadasComTurmaVazia": "Provas liberadas para turmas vazias.",
        "respostasSemTentativa": "Respostas legadas sem tentativa vinculada.",
    }
    for chave, mensagem in checks_aviso.items():
        total = int(integridade.get(chave, 0))
        if total:
            avisos.append({"codigo": chave, "mensagem": mensagem, "total": total})

    return {"criticas": criticas, "avisos": avisos}


def _recomendacoes(status: str, integridade: dict, configuracoes: dict) -> list[str]:
    recomendacoes: list[str] = []
    if status == "ok":
        recomendacoes.append("Base operacional consistente para os fluxos principais.")
    if not configuracoes["ok"]:
        recomendacoes.append("Recriar configuracoes obrigatorias pelo seed seguro ou painel admin.")
    if integridade.get("questoesComGabaritoInvalido"):
        recomendacoes.append("Resolver gabaritos invalidos antes de liberar novas provas.")
    if integridade.get("provasLiberadasSemSnapshot"):
        recomendacoes.append("Executar POST /diagnostico/reparar-snapshots para gerar snapshots de provas antigas ja liberadas.")
    if integridade.get("tentativasFinalizadasSemResultado"):
        recomendacoes.append("Reprocessar resultados das tentativas finalizadas sem resultado.")
    if integridade.get("respostasSemTentativa"):
        recomendacoes.append("Executar migracao/backfill de tentativas para respostas legadas.")
    return recomendacoes
