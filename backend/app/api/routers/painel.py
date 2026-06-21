"""Endpoints agregados das telas (dashboards por papel).

Diferente dos demais routers (orientados a recurso), aqui montamos respostas
no formato que cada tela do front espera (camelCase) — funcionam como BFF do
lado do servidor. Valores sem origem no banco (deltas semana-a-semana, insights
de IA) vêm zerados/vazios e estão sinalizados.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import dominio_labels as labels
from app.api.deps import get_session
from app.api.permissoes import (
    admin_gestor,
    admin_gestor_suporte,
    aplicar_escopo_questoes,
    autenticado,
    montadores_prova,
    so_admin,
    usuario_pode_ver_questao,
)
from app.api.routers.questoes import _serializar as _serializar_questao
from app.enums import PerfilUsuario, StatusQuestao, StatusSimulado
from app.services import auditoria_service, questao_service, simulado_service
from app.models import (
    Aluno,
    Alternativa,
    Escola,
    GuiaEstudo,
    Materia,
    Nivel,
    Questao,
    Resposta,
    Serie,
    Simulado,
    SimuladoInscricao,
    SimuladoQuestao,
    Turma,
    Usuario,
)

# Status do simulado: enum/maiúsculo do banco -> code do frontend.
_SIM_STATUS_FRONT = {
    "RASCUNHO": "rascunho",
    "rascunho": "rascunho",
    "GERADO": "em_curadoria",
    "gerado": "em_curadoria",
    "LIBERADO": "liberado",
    "liberado": "liberado",
    "FINALIZADO": "finalizado",
    "finalizado": "finalizado",
    "CANCELADO": "cancelado",
    "cancelado": "cancelado",
}


def _status_simulado_front(valor) -> str:
    raw = getattr(valor, "value", valor)
    return _SIM_STATUS_FRONT.get(raw, "rascunho")


_SERIE_NOME_PARA_CODE = {v: k for k, v in labels.MAP_SERIE.items()}
_MATERIA_NOME_PARA_CODE = {v: k for k, v in labels.MAP_MATERIA.items()}
_NIVEIS_FRONT = {"facil", "medio", "dificil"}


def _code_por_nome(mapa: dict[str, str], reverso: dict[str, str], valor) -> str | None:
    if valor is None:
        return None
    raw = getattr(valor, "value", valor)
    texto = str(raw).strip()
    if not texto:
        return None
    if texto in mapa:
        return texto
    if texto in reverso:
        return reverso[texto]
    normalizado = texto.casefold()
    for code, nome in mapa.items():
        if code.casefold() == normalizado or nome.casefold() == normalizado:
            return code
    return None


def _serie_code(valor) -> str | None:
    return _code_por_nome(labels.MAP_SERIE, _SERIE_NOME_PARA_CODE, valor)


def _materia_code(valor) -> str | None:
    return _code_por_nome(labels.MAP_MATERIA, _MATERIA_NOME_PARA_CODE, valor)


def _nivel_code_front(valor) -> str | None:
    if valor is None:
        return None
    raw = getattr(valor, "value", valor)
    texto = str(raw).strip()
    if not texto:
        return None
    if texto in _NIVEIS_FRONT:
        return texto
    code = labels.nivel_code(texto)
    if code in _NIVEIS_FRONT:
        return code
    normalizado = code.casefold()
    for nivel in _NIVEIS_FRONT:
        if nivel.casefold() == normalizado:
            return nivel
    for code_front, nome in labels.MAP_NIVEL.items():
        if nome.casefold() == texto.casefold():
            return code_front
    return None


def _lista_unica(valores) -> list:
    if valores is None:
        return []
    if not isinstance(valores, list):
        valores = [valores]
    out = []
    vistos = set()
    for valor in valores:
        if valor is None:
            continue
        chave = str(valor).strip()
        if not chave or chave in vistos:
            continue
        out.append(valor)
        vistos.add(chave)
    return out


def _inteiro_positivo(valor, padrao: int) -> int:
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        return padrao
    return numero if numero >= 0 else padrao


def _normalizar_distribuicao(parametros: dict, simulado: Simulado) -> dict[str, int]:
    dados = parametros.get("distribuicao") if isinstance(parametros, dict) else None
    normalizada = {"facil": 0, "medio": 0, "dificil": 0}
    if isinstance(dados, dict):
        valores: list[float] = []
        bruta = {"facil": 0.0, "medio": 0.0, "dificil": 0.0}
        for chave, valor in dados.items():
            code = _nivel_code_front(chave)
            if code not in bruta:
                continue
            try:
                numero = float(valor)
            except (TypeError, ValueError):
                numero = 0
            bruta[code] = max(0.0, numero)
            valores.append(numero)
        if valores and all(0 <= v <= 1 for v in valores):
            normalizada = {k: round(v * 100) for k, v in bruta.items()}
        else:
            normalizada = {k: round(v) for k, v in bruta.items()}
        if any(normalizada.values()):
            return normalizada

    contagem = {"facil": 0, "medio": 0, "dificil": 0}
    for sq in simulado.questoes:
        if not sq.questao or not sq.questao.nivel:
            continue
        code = _nivel_code_front(sq.questao.nivel.nome)
        if code in contagem:
            contagem[code] += 1
    total = sum(contagem.values())
    if total == 0:
        return normalizada
    facil = round((contagem["facil"] / total) * 100)
    medio = round((contagem["medio"] / total) * 100)
    return {"facil": facil, "medio": medio, "dificil": max(0, 100 - facil - medio)}


def _normalizar_parametros_simulado(s: Simulado) -> dict:
    p = s.parametros_json if isinstance(s.parametros_json, dict) else {}
    questoes = [
        sq.questao
        for sq in sorted(s.questoes, key=lambda x: x.ordem_questao)
        if sq.questao
    ]

    serie = _serie_code(p.get("serie"))
    if serie is None and s.turma and s.turma.serie:
        serie = _serie_code(s.turma.serie.nome)
    if serie is None and questoes:
        serie = _serie_code(questoes[0].serie.nome if questoes[0].serie else None)

    materias_raw = p.get("materias") or p.get("materia")
    materias = [_materia_code(m) for m in _lista_unica(materias_raw)]
    if not any(materias):
        materias = [_materia_code(q.materia.nome if q.materia else None) for q in questoes]
    materias = [m for m in _lista_unica(materias) if m]

    conteudos_raw = p.get("conteudos") or p.get("conteudo")
    conteudos = [str(c).strip() for c in _lista_unica(conteudos_raw) if str(c).strip()]
    if not conteudos:
        conteudos = [q.conteudo.nome for q in questoes if q.conteudo and q.conteudo.nome]
        conteudos = [str(c).strip() for c in _lista_unica(conteudos) if str(c).strip()]

    turma_id = p.get("turmaId", s.turma_id)
    quantidade = _inteiro_positivo(
        p.get("quantidadeQuestoes", p.get("quantidade")),
        len(questoes),
    )
    tempo = _inteiro_positivo(
        p.get("tempoLimiteMinutos", p.get("duracaoMinutos", p.get("tempo"))),
        60,
    )
    liberado_em = p.get("liberadoEm")
    if not liberado_em and _status_simulado_front(s.status) in (
        "liberado",
        "em_andamento",
        "finalizado",
    ):
        liberado_em = s.criado_em.date().isoformat() if s.criado_em else None

    normalizado = {
        "nome": str(p.get("nome") or s.titulo or f"Simulado {s.id}").strip(),
        "turmaId": str(turma_id or ""),
        "serie": serie or "9_fundamental",
        "materias": materias,
        "conteudos": conteudos,
        "quantidadeQuestoes": quantidade,
        "distribuicao": _normalizar_distribuicao(p, s),
        "adaptacoesAceitas": p.get("adaptacoesAceitas") or p.get("adaptacoes") or [],
        "tempoLimiteMinutos": tempo,
    }
    if liberado_em:
        normalizado["liberadoEm"] = liberado_em
    if p.get("encerraEm"):
        normalizado["encerraEm"] = p.get("encerraEm")
    return normalizado


def _serializar_simulado(s: Simulado) -> dict:
    """Reconstrói o shape Simulado do frontend a partir do registro do banco.
    parametros_json já guarda o ParametrosSimulado original (camelCase)."""
    questao_ids = [str(sq.questao_id) for sq in sorted(s.questoes, key=lambda x: x.ordem_questao)]
    escola_id = s.turma.escola_id if s.turma else None
    criado = s.criado_em.isoformat() if s.criado_em else None
    return {
        "id": str(s.id),
        "parametros": _normalizar_parametros_simulado(s),
        "questaoIds": questao_ids,
        "status": _status_simulado_front(s.status),
        "criadoPor": str(s.gestor_id),
        "escolaId": str(escola_id) if escola_id else "",
        "criadoEm": criado,
        "atualizadoEm": criado,
    }


def _computar_resultado(
    sessao: Session,
    aluno_id: int,
    simulado: Simulado,
    *,
    incluir_sem_respostas: bool = False,
) -> dict | None:
    """Calcula o ResultadoSimulado do aluno a partir das respostas no banco."""
    ids_questoes = {sq.questao_id for sq in simulado.questoes}
    respostas = sessao.scalars(
        select(Resposta).where(
            Resposta.aluno_id == aluno_id, Resposta.simulado_id == simulado.id
        )
    ).all()
    # Conta só respostas de questões que AINDA estão na prova — evita contagem
    # inflada de erros se uma questão foi removida da prova após ser respondida.
    respostas = [r for r in respostas if r.questao_id in ids_questoes]
    if not respostas and not incluir_sem_respostas:
        return None
    total_questoes = len(ids_questoes)
    acertos = sum(1 for r in respostas if r.correta)
    respondidas = len(respostas)
    erros = respondidas - acertos
    em_branco = max(0, total_questoes - respondidas)
    nota = round((acertos / total_questoes) * 10, 1) if total_questoes else 0.0
    _tempos = [r.respondida_em for r in respostas if r.respondida_em]
    primeira = min(_tempos) if _tempos else None
    ultima = max(_tempos) if _tempos else None
    inscricao = _inscricao_simulado_aluno(sessao, aluno_id, simulado.id)
    finalizado_em = (
        ultima
        or (inscricao.inscrito_em if inscricao and inscricao.status == "finalizado" else None)
        or simulado.criado_em
    )
    # Tempo real gasto = da 1ª à última resposta (autosave grava cada uma na hora).
    tempo_total = (
        int((ultima - primeira).total_seconds()) if primeira and ultima else 0
    )
    return {
        "id": f"res_{aluno_id}_{simulado.id}",
        "simuladoId": str(simulado.id),
        "alunoId": str(aluno_id),
        "respostas": [
            {
                "questaoId": str(r.questao_id),
                "alternativaId": str(r.alternativa_id),
                "status": "respondida",
                "tempoGastoSegundos": 0,
                "trocasDeResposta": 0,
                "respondidaEm": r.respondida_em.isoformat() if r.respondida_em else None,
            }
            for r in respostas
        ],
        "notaFinal": nota,
        "preenchidas": respondidas,
        "acertos": acertos,
        "erros": erros,
        "emBranco": em_branco,
        "tempoTotalSegundos": tempo_total,
        "iniciadoEm": primeira.isoformat() if primeira else (finalizado_em.isoformat() if finalizado_em else None),
        "finalizadoEm": finalizado_em.isoformat() if finalizado_em else None,
        "desempenhoPorCompetencia": [],
    }


def _aluno_do_usuario(usuario: Usuario) -> Aluno:
    if usuario.aluno is None:
        raise HTTPException(status_code=403, detail="Usuário não é um aluno.")
    return usuario.aluno


def _simulado_tem_resposta_do_aluno(sessao: Session, aluno: Aluno, simulado: Simulado) -> bool:
    return bool(
        sessao.scalar(
            select(Resposta.id).where(
                Resposta.aluno_id == aluno.id,
                Resposta.simulado_id == simulado.id,
            )
        )
    )


def _inscricao_simulado_aluno(
    sessao: Session, aluno_id: int, simulado_id: int
) -> SimuladoInscricao | None:
    return sessao.scalar(
        select(SimuladoInscricao).where(
            SimuladoInscricao.aluno_id == aluno_id,
            SimuladoInscricao.simulado_id == simulado_id,
        )
    )


def _simulado_finalizado_por_aluno(
    sessao: Session, aluno: Aluno, simulado: Simulado
) -> bool:
    inscricao = _inscricao_simulado_aluno(sessao, aluno.id, simulado.id)
    return inscricao is not None and inscricao.status == "finalizado"


def _marcar_simulado_finalizado_para_aluno(
    sessao: Session, aluno: Aluno, simulado: Simulado
) -> None:
    inscricao = _inscricao_simulado_aluno(sessao, aluno.id, simulado.id)
    agora = datetime.now(timezone.utc)
    if inscricao is None:
        sessao.add(
            SimuladoInscricao(
                aluno_id=aluno.id,
                simulado_id=simulado.id,
                status="finalizado",
                inscrito_em=agora,
            )
        )
        return
    inscricao.status = "finalizado"
    inscricao.inscrito_em = agora


def _exigir_acesso_aluno_simulado(
    sessao: Session,
    aluno: Aluno,
    simulado: Simulado,
    *,
    exigir_liberado: bool = True,
) -> None:
    mesma_turma = aluno.turma_id is not None and simulado.turma_id == aluno.turma_id
    inscrito = simulado_service.aluno_tem_acesso(
        sessao, aluno_id=aluno.id, simulado=simulado,
    )
    ja_respondeu = _simulado_tem_resposta_do_aluno(sessao, aluno, simulado)
    if not mesma_turma and not inscrito and not ja_respondeu:
        raise HTTPException(status_code=403, detail="Simulado fora do seu escopo.")
    if exigir_liberado and not ja_respondeu and _status_simulado_front(simulado.status) != "liberado":
        raise HTTPException(status_code=403, detail="Simulado ainda não liberado.")


def _exigir_acesso_aluno_simulado_v2(
    sessao: Session,
    aluno: Aluno,
    simulado: Simulado,
    *,
    exigir_liberado: bool = True,
    permitir_finalizado: bool = False,
) -> None:
    inscrito_ativo = simulado_service.aluno_tem_acesso(
        sessao, aluno_id=aluno.id, simulado=simulado,
    )
    finalizado = _simulado_finalizado_por_aluno(sessao, aluno, simulado)
    ja_respondeu = _simulado_tem_resposta_do_aluno(sessao, aluno, simulado)
    if finalizado and not permitir_finalizado:
        raise HTTPException(
            status_code=409,
            detail="Este simulado ja foi finalizado. Peca nova liberacao para responder novamente.",
        )
    if not inscrito_ativo and not (permitir_finalizado and (finalizado or ja_respondeu)):
        raise HTTPException(status_code=403, detail="Simulado fora do seu escopo.")
    if (
        exigir_liberado
        and not ja_respondeu
        and _status_simulado_front(simulado.status) != "liberado"
    ):
        raise HTTPException(status_code=403, detail="Simulado ainda nao liberado.")


def _turmas_do_usuario(sessao: Session, usuario: Usuario) -> list[Turma]:
    if usuario.perfil == PerfilUsuario.ADMIN:
        return sessao.scalars(select(Turma)).all()
    if usuario.escola_id:
        return sessao.scalars(select(Turma).where(Turma.escola_id == usuario.escola_id)).all()
    turma_ids = sessao.scalars(
        select(Simulado.turma_id).where(Simulado.gestor_id == usuario.id).distinct()
    ).all()
    return sessao.scalars(select(Turma).where(Turma.id.in_(turma_ids))).all() if turma_ids else []


def _exigir_turma_permitida(sessao: Session, usuario: Usuario, turma_id: int | None) -> Turma:
    if turma_id is None:
        raise HTTPException(status_code=422, detail="turmaId é obrigatório.")
    turma = sessao.get(Turma, turma_id)
    if turma is None:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    if usuario.perfil == PerfilUsuario.ADMIN:
        return turma
    if usuario.escola_id is not None and turma.escola_id == usuario.escola_id:
        return turma
    raise HTTPException(status_code=403, detail="Turma fora do seu escopo.")


def _simulados_do_usuario(sessao: Session, usuario: Usuario) -> list[Simulado]:
    q = select(Simulado).order_by(Simulado.criado_em.desc())
    if usuario.perfil == PerfilUsuario.ADMIN:
        return sessao.scalars(q).all()
    turmas = _turmas_do_usuario(sessao, usuario)
    turma_ids = [t.id for t in turmas]
    if turma_ids:
        q = q.where((Simulado.gestor_id == usuario.id) | (Simulado.turma_id.in_(turma_ids)))
    else:
        q = q.where(Simulado.gestor_id == usuario.id)
    return sessao.scalars(q).all()


def _exigir_acesso_simulado(sessao: Session, usuario: Usuario, simulado: Simulado) -> None:
    if usuario.perfil == PerfilUsuario.ADMIN:
        return
    if simulado.gestor_id == usuario.id:
        return
    if simulado.turma and usuario.escola_id is not None and simulado.turma.escola_id == usuario.escola_id:
        return
    raise HTTPException(status_code=403, detail="Simulado fora do seu escopo.")


def _alunos_do_simulado(simulado: Simulado) -> list[Aluno]:
    alunos: dict[int, Aluno] = {}
    for aluno in (simulado.turma.alunos if simulado.turma else []):
        alunos[aluno.id] = aluno
    for inscricao in simulado.inscricoes:
        if inscricao.status == "inscrito" and inscricao.aluno:
            alunos[inscricao.aluno_id] = inscricao.aluno
    return sorted(alunos.values(), key=lambda a: a.usuario.nome if a.usuario else "")


def _questao_permitida_para_prova(sessao: Session, usuario: Usuario, questao: Questao) -> bool:
    return usuario_pode_ver_questao(sessao, usuario, questao)


def _aluno_tem_suporte_ou_adaptacao(aluno: Aluno) -> bool:
    return bool(aluno.necessita_suporte or aluno.perfil_cognitivo)


def _aluno_visivel_suporte(usuario: Usuario, aluno: Aluno) -> bool:
    if not _aluno_tem_suporte_ou_adaptacao(aluno):
        return False
    if usuario.perfil == PerfilUsuario.ADMIN:
        return True
    escola_id = aluno.turma.escola_id if aluno.turma else None
    return usuario.escola_id is not None and escola_id == usuario.escola_id


def _exigir_aluno_suporte_visivel(usuario: Usuario, aluno: Aluno) -> None:
    if not _aluno_visivel_suporte(usuario, aluno):
        raise HTTPException(status_code=403, detail="Aluno fora do escopo de suporte.")

router = APIRouter(tags=["painel"])


@router.get("/admin/dashboard", dependencies=[Depends(so_admin)])
def dashboard_admin(sessao: Session = Depends(get_session)) -> dict:
    total_questoes = sessao.scalar(select(func.count(Questao.id))) or 0
    total_escolas = (
        sessao.scalar(select(func.count(Escola.id)).where(Escola.ativa.is_(True))) or 0
    )

    agora = datetime.now(timezone.utc)
    simulados_no_mes = (
        sessao.scalar(
            select(func.count(Simulado.id)).where(
                func.extract("month", Simulado.criado_em) == agora.month,
                func.extract("year", Simulado.criado_em) == agora.year,
            )
        )
        or 0
    )
    alunos_em_risco = (
        sessao.scalar(select(func.count(Aluno.id)).where(Aluno.necessita_suporte.is_(True)))
        or 0
    )

    # Tendência das últimas 12 semanas — contagens reais por janela semanal.
    tendencia = []
    for i in range(11, -1, -1):
        fim = agora - timedelta(weeks=i)
        ini = fim - timedelta(weeks=1)
        q = (
            sessao.scalar(
                select(func.count(Questao.id)).where(
                    Questao.criada_em >= ini, Questao.criada_em < fim
                )
            )
            or 0
        )
        s = (
            sessao.scalar(
                select(func.count(Simulado.id)).where(
                    Simulado.criado_em >= ini, Simulado.criado_em < fim
                )
            )
            or 0
        )
        tendencia.append(
            {"semana": f"S{12 - i}", "questoes": q, "simulados": s, "importacoes": 0}
        )

    # Top escolas por nº de simulados aplicados (via turmas da escola).
    top = []
    for e in sessao.scalars(select(Escola)).all():
        turma_ids = [t.id for t in e.turmas]
        total_alunos = sum(len(t.alunos) for t in e.turmas)
        sim_aplicados = 0
        responderam = 0
        if turma_ids:
            sim_aplicados = (
                sessao.scalar(
                    select(func.count(Simulado.id)).where(Simulado.turma_id.in_(turma_ids))
                )
                or 0
            )
            responderam = (
                sessao.scalar(
                    select(func.count(func.distinct(Resposta.aluno_id)))
                    .select_from(Resposta)
                    .join(Aluno, Resposta.aluno_id == Aluno.id)
                    .where(Aluno.turma_id.in_(turma_ids))
                )
                or 0
            )
        taxa = round(responderam / total_alunos, 2) if total_alunos else 0.0
        top.append(
            {
                "escola": {"id": str(e.id), "nome": e.nome, "municipio": e.municipio or ""},
                "simuladosAplicados": sim_aplicados,
                "totalAlunos": total_alunos,
                "taxaParticipacao": taxa,
            }
        )
    top.sort(key=lambda x: x["simuladosAplicados"], reverse=True)

    return {
        "kpis": {
            "totalQuestoes": total_questoes,
            "totalEscolas": total_escolas,
            "simuladosNoMes": simulados_no_mes,
            "alunosEmRisco": alunos_em_risco,
            # deltas semana-a-semana exigem histórico que o banco não guarda → 0
            "deltaQuestoes": 0,
            "deltaEscolas": 0,
            "deltaSimulados": 0,
            "deltaRisco": 0,
        },
        "tendenciaSemanal": tendencia,
        "topEscolas": top[:10],
        "insights": [],  # insights de IA não têm origem no banco
    }


# ---------------------------------------------------------------------------
# ALUNO (telas do próprio aluno — ownership pelo token)
# ---------------------------------------------------------------------------


@router.get("/aluno/home")
def aluno_home(
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = _aluno_do_usuario(usuario)

    proximo = None
    if aluno.turma_id:
        for s in sessao.scalars(
            select(Simulado)
            .where(Simulado.turma_id == aluno.turma_id)
            .order_by(Simulado.criado_em.desc())
        ).all():
            if (
                _status_simulado_front(s.status) in ("liberado", "em_andamento")
                and simulado_service.aluno_tem_acesso(sessao, aluno_id=aluno.id, simulado=s)
            ):
                proximo = _serializar_simulado(s)
                break
    if proximo is None:
        for s in sessao.scalars(
            select(Simulado)
            .join(SimuladoInscricao, SimuladoInscricao.simulado_id == Simulado.id)
            .where(
                SimuladoInscricao.aluno_id == aluno.id,
                SimuladoInscricao.status == "inscrito",
            )
            .order_by(Simulado.criado_em.desc())
        ).all():
            if _status_simulado_front(s.status) in ("liberado", "em_andamento"):
                proximo = _serializar_simulado(s)
                break

    resultados = _resultados_do_aluno(sessao, aluno)
    evolucao = [
        {"simuladoId": r["simuladoId"], "nota": r["notaFinal"], "data": r["finalizadoEm"]}
        for r in sorted(resultados, key=lambda x: x["finalizadoEm"] or "")[-6:]
    ]
    return {
        "proximoSimulado": proximo,
        "ultimosResultados": resultados[:5],
        "evolucao": evolucao,
        "mensagemBoasVindas": None,
    }


@router.get("/aluno/historico")
def aluno_historico(
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = _aluno_do_usuario(usuario)
    resultados = _resultados_do_aluno(sessao, aluno)
    dados = []
    for r in resultados:
        sim = sessao.get(Simulado, int(r["simuladoId"]))
        parametros = _normalizar_parametros_simulado(sim) if sim else {}
        materias = parametros.get("materias") or []
        dados.append(
            {
                **r,
                "simuladoNome": parametros.get("nome") or (sim.titulo if sim else "Simulado"),
                "simuladoMateria": materias[0] if materias else None,
            }
        )
    return {"dados": dados}


@router.get("/aluno/simulado/{simulado_id}")
def aluno_simulado(
    simulado_id: int,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = _aluno_do_usuario(usuario)
    s = sessao.get(Simulado, simulado_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_aluno_simulado_v2(sessao, aluno, s)
    questoes = [
        _serializar_questao(sq.questao)
        for sq in sorted(s.questoes, key=lambda x: x.ordem_questao)
        if sq.questao
    ]
    respostas = sessao.scalars(
        select(Resposta).where(
            Resposta.aluno_id == aluno.id,
            Resposta.simulado_id == s.id,
        )
    ).all()
    return {
        "simulado": _serializar_simulado(s),
        "questoes": questoes,
        "respostas": [
            {
                "questaoId": str(r.questao_id),
                "alternativaId": str(r.alternativa_id),
                "status": "respondida",
                "tempoGastoSegundos": 0,
                "trocasDeResposta": 0,
                "respondidaEm": r.respondida_em.isoformat() if r.respondida_em else None,
            }
            for r in respostas
        ],
    }


@router.get("/aluno/simulado/{simulado_id}/resultado")
def aluno_resultado(
    simulado_id: int,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = _aluno_do_usuario(usuario)
    s = sessao.get(Simulado, simulado_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_aluno_simulado_v2(
        sessao, aluno, s, exigir_liberado=False, permitir_finalizado=True
    )
    resultado = _computar_resultado(sessao, aluno.id, s)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Resultado não disponível.")
    questoes = [
        _serializar_questao(sq.questao)
        for sq in sorted(s.questoes, key=lambda x: x.ordem_questao)
        if sq.questao
    ]
    return {
        "simulado": _serializar_simulado(s),
        "resultado": resultado,
        "questoes": questoes,
        "diagnostico": None,  # diagnóstico de IA não tem origem no banco
        "mensagem": None,
        "sugestoes": [],
    }


# ---------------------------------------------------------------------------
# GESTOR (escopo: escola do gestor). Campos de IA (risco/curadoria/tendência)
# não têm origem no banco — entram zerados/vazios.
# ---------------------------------------------------------------------------


def _usuario_card(u: Usuario) -> dict:
    return {
        "id": str(u.id),
        "nome": u.nome,
        "email": u.email,
        "perfil": u.perfil.value,
        "ativo": u.ativo,
        "fotoUrl": u.foto_url,
        "criadoEm": u.criado_em.isoformat() if u.criado_em else None,
        "ultimoAcesso": u.ultimo_acesso.isoformat() if u.ultimo_acesso else None,
    }


def _turmas_do_gestor(sessao: Session, gestor: Usuario) -> list[Turma]:
    return _turmas_do_usuario(sessao, gestor)


def _media_simulado(sessao: Session, simulado: Simulado) -> float | None:
    respostas = sessao.scalars(
        select(Resposta).where(Resposta.simulado_id == simulado.id)
    ).all()
    if not respostas:
        return None
    total_q = len(simulado.questoes) or 1
    por_aluno: dict[int, int] = {}
    for r in respostas:
        por_aluno.setdefault(r.aluno_id, 0)
        if r.correta:
            por_aluno[r.aluno_id] += 1
    notas = [(ac / total_q) * 10 for ac in por_aluno.values()]
    return round(sum(notas) / len(notas), 1) if notas else None


# --- heurísticas reais (substituem os antigos campos de IA zerados) ---


def _media_aluno(sessao: Session, aluno: Aluno) -> float | None:
    res = _resultados_do_aluno(sessao, aluno)
    return round(sum(r["notaFinal"] for r in res) / len(res), 1) if res else None


def _prob_risco_media(aluno: Aluno, media: float | None) -> float:
    """Risco real derivado da média do aluno + necessidade de suporte."""
    base = 0.45 if aluno.necessita_suporte else 0.12
    if media is None:
        ajuste = 0.10
    elif media < 6:
        ajuste = (6 - media) / 12
    else:
        ajuste = 0.0
    return round(min(0.95, base + ajuste), 2)


def _prob_risco(sessao: Session, aluno: Aluno) -> float:
    return _prob_risco_media(aluno, _media_aluno(sessao, aluno))


def _insights_gestor(medias_turma: list[dict], alunos_risco: list, meus: list) -> list[dict]:
    """Achados reais (não-LLM) a partir dos números agregados do gestor."""
    agora = datetime.now(timezone.utc).isoformat()
    out: list[dict] = []
    com_media = [m for m in medias_turma if m["media"] > 0]
    if com_media:
        melhor = max(com_media, key=lambda m: m["media"])
        pior = min(com_media, key=lambda m: m["media"])
        if melhor["turmaId"] != pior["turmaId"]:
            out.append(
                {
                    "id": "ins_turmas",
                    "titulo": "Dispersão entre turmas",
                    "texto": (
                        f"{melhor['turmaNome']} lidera com média {melhor['media']}; "
                        f"{pior['turmaNome']} é a menor, com {pior['media']}."
                    ),
                    "geradoEm": agora,
                    "modeloUsado": "heuristica",
                    "contextoIds": [melhor["turmaId"], pior["turmaId"]],
                }
            )
    if alunos_risco:
        out.append(
            {
                "id": "ins_risco",
                "titulo": "Alunos em acompanhamento",
                "texto": (
                    f"{len(alunos_risco)} aluno(s) sinalizados para suporte. "
                    "Priorize os de maior probabilidade de risco."
                ),
                "geradoEm": agora,
                "modeloUsado": "heuristica",
                "contextoIds": [a["aluno"]["id"] for a in alunos_risco[:5]],
            }
        )
    pendentes = [s for s in meus if s.get("status") in ("rascunho", "em_curadoria")]
    if pendentes:
        out.append(
            {
                "id": "ins_pendentes",
                "titulo": "Simulados aguardando ação",
                "texto": f"{len(pendentes)} simulado(s) ainda não liberados para os alunos.",
                "geradoEm": agora,
                "modeloUsado": "heuristica",
                "contextoIds": [str(s.get("id")) for s in pendentes[:5]],
            }
        )
    return out


def _tendencia_risco(media: float | None) -> str:
    if media is None:
        return "estavel"
    if media < 5:
        return "caindo"
    return "subindo" if media >= 7 else "estavel"


def _competencias_fracas_aluno(sessao: Session, aluno: Aluno) -> list[str]:
    erradas = sessao.scalars(
        select(Resposta).where(
            Resposta.aluno_id == aluno.id, Resposta.correta.is_(False)
        )
    ).all()
    comp: set[str] = set()
    for r in erradas:
        q = sessao.get(Questao, r.questao_id)
        if q and q.competencias:
            comp.update(q.competencias)
    return sorted(comp)[:3]


def _competencias_simulado(sessao: Session, sim: Simulado) -> list[dict]:
    respostas = sessao.scalars(
        select(Resposta).where(Resposta.simulado_id == sim.id)
    ).all()
    stats: dict[str, list[int]] = {}
    for r in respostas:
        q = sessao.get(Questao, r.questao_id)
        if not q or not q.competencias:
            continue
        for c in q.competencias:
            st = stats.setdefault(c, [0, 0])
            st[1] += 1
            if r.correta:
                st[0] += 1
    return [
        {
            "competencia": c,
            "acertos": ac,
            "totalQuestoes": tot,
            "taxaAcerto": round(ac / tot, 2) if tot else 0.0,
            "mediaEstadual": 0.0,
        }
        for c, (ac, tot) in sorted(stats.items())
    ]


def _tendencia_semanal_gestor(sessao: Session, sims: list[Simulado]) -> list[dict]:
    agora = datetime.now(timezone.utc)
    out = []
    for i in range(11, -1, -1):
        fim = agora - timedelta(weeks=i)
        ini = fim - timedelta(weeks=1)
        sims_sem = [s for s in sims if s.criado_em and ini <= s.criado_em < fim]
        notas = [m for s in sims_sem if (m := _media_simulado(sessao, s)) is not None]
        out.append(
            {
                "semana": f"S{12 - i}",
                "media": round(sum(notas) / len(notas), 1) if notas else 0.0,
                "simulados": len(sims_sem),
            }
        )
    return out


@router.get("/gestor/dashboard", dependencies=[Depends(admin_gestor)])
def dashboard_gestor(
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    turmas = _turmas_do_gestor(sessao, usuario)
    turma_ids = [t.id for t in turmas]
    sims = _simulados_do_usuario(sessao, usuario)
    medias = [m for s in sims if (m := _media_simulado(sessao, s)) is not None]
    em_risco = 0
    if turma_ids:
        em_risco = (
            sessao.scalar(
                select(func.count(Aluno.id)).where(
                    Aluno.turma_id.in_(turma_ids), Aluno.necessita_suporte.is_(True)
                )
            )
            or 0
        )

    meus = []
    for s in sims[:10]:
        d = _serializar_simulado(s)
        d["totalAlunos"] = len(s.turma.alunos) if s.turma else 0
        meus.append(d)

    medias_turma = []
    for t in turmas:
        ms = [
            m
            for s in sims
            if s.turma_id == t.id and (m := _media_simulado(sessao, s)) is not None
        ]
        medias_turma.append(
            {
                "turmaId": str(t.id),
                "turmaNome": t.nome or f"Turma {t.id}",
                "media": round(sum(ms) / len(ms), 1) if ms else 0.0,
            }
        )

    alunos_risco = []
    if turma_ids:
        for a in sessao.scalars(
            select(Aluno)
            .where(Aluno.turma_id.in_(turma_ids), Aluno.necessita_suporte.is_(True))
            .limit(10)
        ).all():
            if a.usuario:
                media_a = _media_aluno(sessao, a)
                alunos_risco.append(
                    {
                        "aluno": _usuario_card(a.usuario),
                        "probabilidadeRisco": _prob_risco(sessao, a),
                        "tendencia": _tendencia_risco(media_a),
                        "ultimaAtualizacao": datetime.now(timezone.utc).isoformat(),
                    }
                )

    return {
        "kpis": {
            "totalAlunos": sum(len(t.alunos) for t in turmas),
            "totalEscolas": len({t.escola_id for t in turmas}),
            "totalTurmas": len(turmas),
            "simuladosEmAndamento": sum(
                1
                for s in sims
                if _status_simulado_front(s.status) in ("liberado", "em_andamento")
            ),
            "mediaGeral": round(sum(medias) / len(medias), 1) if medias else 0.0,
            "alertasIA": em_risco,
        },
        "meusSimulados": meus,
        "alunosEmRisco": alunos_risco,
        "mediasPorTurma": medias_turma,
        "tendenciaSemanal": _tendencia_semanal_gestor(sessao, sims),
        "insights": _insights_gestor(medias_turma, alunos_risco, meus),
    }


@router.get("/gestor/turmas", dependencies=[Depends(montadores_prova)])
def gestor_turmas(
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    dados = []
    for t in _turmas_do_gestor(sessao, usuario):
        simulados = list(t.simulados or [])
        alunos = [a for a in (t.alunos or []) if a.usuario]
        dados.append(
            {
                "id": str(t.id),
                "nome": t.nome or f"Turma {t.id}",
                "escolaId": str(t.escola_id),
                "serie": _SERIE_NOME_PARA_CODE.get(t.serie.nome, "") if t.serie else "",
                "turno": "matutino",
                "anoLetivo": t.ano_letivo,
                "alunoIds": [str(a.id) for a in alunos],
                "alunos": [
                    {
                        "id": str(a.id),
                        "usuarioId": str(a.usuario_id),
                        "nome": a.usuario.nome,
                        "email": a.usuario.email,
                        "necessitaSuporte": bool(a.necessita_suporte),
                    }
                    for a in alunos[:8]
                ],
                "ativa": True,
                "criadaEm": datetime.now(timezone.utc).isoformat(),
                "escolaNome": t.escola.nome if t.escola else "",
                "totalAlunos": len(alunos),
                "totalComAdaptacao": sum(1 for a in alunos if a.necessita_suporte),
                "totalSimulados": len(simulados),
                "simuladosLiberados": sum(
                    1 for s in simulados if _status_simulado_front(s.status) == "liberado"
                ),
                "simuladosFinalizados": sum(
                    1 for s in simulados if _status_simulado_front(s.status) == "finalizado"
                ),
            }
        )
    return {"dados": dados}


@router.get("/gestor/simulados", dependencies=[Depends(montadores_prova)])
def gestor_simulados(
    status: str | None = None,
    busca: str | None = None,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sims = _simulados_do_usuario(sessao, usuario)
    dados = [_serializar_simulado(s) for s in sims]
    if status:
        if status == "historico":
            dados = [d for d in dados if d["status"] in ("finalizado", "cancelado")]
        else:
            dados = [d for d in dados if d["status"] == status]
    if busca:
        termo = busca.lower()
        dados = [d for d in dados if termo in d["parametros"].get("nome", "").lower()]
    return {"dados": dados}


@router.get("/gestor/alertas", dependencies=[Depends(admin_gestor)])
def gestor_alertas(
    usuario: Usuario = Depends(admin_gestor),
    sessao: Session = Depends(get_session),
) -> dict:
    turmas = _turmas_do_gestor(sessao, usuario)
    turma_nome = {t.id: (t.nome or f"Turma {t.id}") for t in turmas}
    dados = []
    if turma_nome:
        for a in sessao.scalars(
            select(Aluno).where(
                Aluno.turma_id.in_(list(turma_nome)),
                Aluno.necessita_suporte.is_(True),
            )
        ).all():
            if a.usuario:
                res = _resultados_do_aluno(sessao, a)
                media = (
                    round(sum(r["notaFinal"] for r in res) / len(res), 1)
                    if res
                    else None
                )
                dados.append(
                    {
                        "aluno": _usuario_card(a.usuario),
                        "turmaNome": turma_nome.get(a.turma_id, ""),
                        "probabilidadeRisco": _prob_risco_media(a, media),
                        "tendencia": _tendencia_risco(media),
                        "ultimaAtualizacao": datetime.now(timezone.utc).isoformat(),
                        "ultimaNota": res[-1]["notaFinal"] if res else 0.0,
                        "competenciasFracas": _competencias_fracas_aluno(sessao, a),
                        "historicoNotas": [
                            {"rodada": i + 1, "nota": r["notaFinal"]}
                            for i, r in enumerate(reversed(res[-6:]))
                        ],
                    }
                )
    alta = sum(1 for d in dados if d["probabilidadeRisco"] >= 0.7)
    media_c = sum(1 for d in dados if 0.4 <= d["probabilidadeRisco"] < 0.7)
    baixa = len(dados) - alta - media_c
    return {
        "dados": dados,
        "contagens": {
            "alta": alta,
            "media": media_c,
            "baixa": baixa,
            "total": len(dados),
        },
    }


@router.post("/gestor/simulados", status_code=201, dependencies=[Depends(montadores_prova)])
def criar_simulado_rascunho(
    parametros: dict,
    request: Request,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    """Cria um simulado em rascunho a partir do ParametrosSimulado do front."""
    turma_id = parametros.get("turmaId")
    try:
        turma_id = int(turma_id) if turma_id is not None else None
    except (TypeError, ValueError):
        turma_id = None
    _exigir_turma_permitida(sessao, usuario, turma_id)
    sim = Simulado(
        gestor_id=usuario.id,
        turma_id=turma_id,
        titulo=parametros.get("nome", "Simulado"),
        parametros_json=parametros,
        status="RASCUNHO",
        criado_em=datetime.now(timezone.utc),
    )
    sessao.add(sim)
    sessao.flush()
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="criar_simulado",
        alvo_tipo="simulado",
        alvo_id=sim.id,
        detalhes=f"Criou simulado {sim.titulo}.",
        request=request,
    )
    sessao.commit()
    sessao.refresh(sim)
    return _serializar_simulado(sim)


# ---------------------------------------------------------------------------
# SUPORTE (acompanhamento de alunos com adaptações — dado sensível, RBAC).
# Estado "ao vivo" (espelhamento) não existe no banco -> vazio.
# ---------------------------------------------------------------------------


def _usuario_aluno_card(u: Usuario, aluno: Aluno) -> dict:
    card = _usuario_card(u)
    card["adaptacoes"] = aluno.perfil_cognitivo or []
    card["turmaIds"] = [str(aluno.turma_id)] if aluno.turma_id else []
    card["escolaId"] = (
        str(aluno.turma.escola_id) if aluno.turma and aluno.turma.escola_id else None
    )
    return card


def _resultados_do_aluno(sessao: Session, aluno: Aluno) -> list[dict]:
    sim_ids = set(sessao.scalars(
        select(Resposta.simulado_id).where(Resposta.aluno_id == aluno.id).distinct()
    ).all())
    sim_ids.update(
        sessao.scalars(
            select(SimuladoInscricao.simulado_id).where(
                SimuladoInscricao.aluno_id == aluno.id,
                SimuladoInscricao.status == "finalizado",
            )
        ).all()
    )
    out = []
    for sid in sim_ids:
        s = sessao.get(Simulado, sid)
        if s:
            r = _computar_resultado(sessao, aluno.id, s, incluir_sem_respostas=True)
            if r:
                out.append(r)
    out.sort(key=lambda x: x["finalizadoEm"] or "", reverse=True)
    return out


@router.get("/suporte/dashboard", dependencies=[Depends(admin_gestor_suporte)])
def suporte_dashboard(
    usuario: Usuario = Depends(admin_gestor_suporte),
    sessao: Session = Depends(get_session),
) -> dict:
    alunos = sessao.scalars(select(Aluno)).all()
    dados = []
    for a in alunos:
        if not a.usuario:
            continue
        if not _aluno_visivel_suporte(usuario, a):
            continue
        res = _resultados_do_aluno(sessao, a)
        dados.append(
            {
                "aluno": _usuario_aluno_card(a.usuario, a),
                "turmaNome": a.turma.nome if a.turma else "—",
                "ultimoResultado": res[0] if res else None,
                "emAndamento": None,
                "totalSimulados": len(res),
            }
        )
    return {
        "dados": dados,
        "contagem": {"total": len(dados), "respondendoAgora": 0},
    }


@router.get("/suporte/aluno/{usuario_id}", dependencies=[Depends(admin_gestor_suporte)])
def suporte_aluno(
    usuario_id: int,
    usuario: Usuario = Depends(admin_gestor_suporte),
    sessao: Session = Depends(get_session),
) -> dict:
    alvo = sessao.get(Usuario, usuario_id)
    if alvo is None or alvo.aluno is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    a = alvo.aluno
    _exigir_aluno_suporte_visivel(usuario, a)
    turma = a.turma
    escola = turma.escola if turma else None
    return {
        "aluno": _usuario_aluno_card(alvo, a),
        "turma": {"id": str(turma.id), "nome": turma.nome} if turma else None,
        "escola": (
            {"id": str(escola.id), "nome": escola.nome, "municipio": escola.municipio}
            if escola
            else None
        ),
        "simuladoAtivo": None,  # sem estado ao vivo no banco
        "questoesAtivas": [],
        "emAndamento": None,
        "ultimosResultados": _resultados_do_aluno(sessao, a)[:5],
    }


@router.get(
    "/suporte/aluno/{usuario_id}/espelhamento",
    dependencies=[Depends(admin_gestor_suporte)],
)
def suporte_espelhamento(
    usuario_id: int,
    usuario: Usuario = Depends(admin_gestor_suporte),
    sessao: Session = Depends(get_session),
) -> dict:
    alvo = sessao.get(Usuario, usuario_id)
    if alvo is None or alvo.aluno is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    _exigir_aluno_suporte_visivel(usuario, alvo.aluno)
    # Espelhamento ao vivo não tem origem no banco (não há sessão em andamento).
    return {
        "emAndamento": None,
        "simulado": None,
        "respostas": [],
        "progresso": {"respondidas": 0, "total": 0, "percentual": 0},
    }


# ---------------------------------------------------------------------------
# GESTOR — ciclo de vida do simulado (detalhe/curar/liberar/acompanhar/relatório)
# ---------------------------------------------------------------------------


def _questoes_do_simulado(sim: Simulado) -> list[dict]:
    return [
        _serializar_questao(sq.questao)
        for sq in sorted(sim.questoes, key=lambda x: x.ordem_questao)
        if sq.questao
    ]


@router.get("/gestor/simulados/{simulado_id}", dependencies=[Depends(montadores_prova)])
def gestor_simulado_detalhe(
    simulado_id: int,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    return {"simulado": _serializar_simulado(sim), "questoes": _questoes_do_simulado(sim)}


@router.patch("/gestor/simulados/{simulado_id}", dependencies=[Depends(montadores_prova)])
def atualizar_simulado(
    simulado_id: int,
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado nao encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    if _status_simulado_front(sim.status) not in ("rascunho", "em_curadoria"):
        raise HTTPException(
            status_code=409,
            detail="Apenas simulados ainda nao liberados podem ser editados.",
        )

    parametros = corpo.get("parametros") if isinstance(corpo.get("parametros"), dict) else corpo
    if not isinstance(parametros, dict):
        raise HTTPException(status_code=422, detail="Informe os parametros do simulado.")

    turma_id_raw = parametros.get("turmaId", sim.turma_id)
    try:
        turma_id = int(turma_id_raw) if turma_id_raw is not None else None
    except (TypeError, ValueError):
        turma_id = None
    _exigir_turma_permitida(sessao, usuario, turma_id)

    atuais = sim.parametros_json or {}
    novos_parametros = {**atuais, **parametros}
    sim.parametros_json = novos_parametros
    sim.turma_id = turma_id
    sim.titulo = novos_parametros.get("nome") or sim.titulo
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="editar_simulado",
        alvo_tipo="simulado",
        alvo_id=sim.id,
        detalhes=f"Editou parametros do simulado {sim.titulo}.",
        request=request,
    )
    sessao.commit()
    sessao.refresh(sim)
    return _serializar_simulado(sim)


@router.delete("/gestor/simulados/{simulado_id}", dependencies=[Depends(montadores_prova)])
def remover_simulado(
    simulado_id: int,
    request: Request,
    forcar: bool = Query(
        False, description="Exclui de vez, mesmo com respostas (apaga resultados)."
    ),
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado nao encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)

    total_respostas = (
        sessao.scalar(
            select(func.count(Resposta.id)).where(Resposta.simulado_id == sim.id)
        )
        or 0
    )
    status_front = _status_simulado_front(sim.status)
    # forcar=True ignora a preservação e apaga tudo de vez (decisão do admin/gestor).
    deve_preservar = (not forcar) and (
        total_respostas > 0
        or status_front in ("liberado", "em_andamento", "finalizado")
    )
    titulo = sim.titulo
    if deve_preservar:
        sim.status = StatusSimulado.CANCELADO
        auditoria_service.registrar(
            sessao,
            usuario=usuario,
            tipo="cancelar_simulado",
            alvo_tipo="simulado",
            alvo_id=sim.id,
            detalhes=f"Cancelou simulado {titulo} preservando respostas/resultados.",
            request=request,
        )
        sessao.commit()
        return {"id": str(sim.id), "removido": False, "cancelado": True}

    # Hard delete. Se forçado, limpa antes as FKs sem cascade: respostas (apaga)
    # e guias de estudo (desvincula), senão o delete viola a constraint.
    if forcar:
        sessao.query(Resposta).filter(Resposta.simulado_id == sim.id).delete(
            synchronize_session=False
        )
        sessao.query(GuiaEstudo).filter(
            GuiaEstudo.gerado_a_partir_simulado_id == sim.id
        ).update(
            {GuiaEstudo.gerado_a_partir_simulado_id: None},
            synchronize_session=False,
        )
    sessao.delete(sim)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="remover_simulado",
        alvo_tipo="simulado",
        alvo_id=simulado_id,
        detalhes=(
            f"Excluiu definitivamente o simulado {titulo}."
            if forcar
            else f"Removeu simulado {titulo} sem respostas vinculadas."
        ),
        request=request,
    )
    sessao.commit()
    return {"id": str(simulado_id), "removido": True, "cancelado": False}


@router.post(
    "/gestor/simulados/{simulado_id}/curar", dependencies=[Depends(montadores_prova)]
)
def curar_simulado(
    simulado_id: int,
    corpo: dict,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    """Seleção REAL de questões do banco por série/matéria/nível (sem IA).
    Persiste as questões escolhidas no simulado (cria SimuladoQuestao)."""
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    p = corpo.get("parametros", {})
    if isinstance(p, dict) and p:
        turma_id_raw = p.get("turmaId", sim.turma_id)
        try:
            turma_id = int(turma_id_raw) if turma_id_raw is not None else None
        except (TypeError, ValueError):
            turma_id = None
        _exigir_turma_permitida(sessao, usuario, turma_id)
        sim.turma_id = turma_id
        sim.parametros_json = {**(sim.parametros_json or {}), **p}
        sim.titulo = sim.parametros_json.get("nome") or sim.titulo
    total = int(p.get("quantidadeQuestoes", 10) or 10)
    alvo = p.get("distribuicao", {}) or {}

    q = (
        sessao.query(Questao)
        .join(Serie, Questao.serie_id == Serie.id)
        .join(Materia, Questao.materia_id == Materia.id)
        .join(Nivel, Questao.nivel_id == Nivel.id)
        .filter(Questao.status == StatusQuestao.PUBLICADA)
    )
    serie_nome = labels.serie_nome(p.get("serie"))
    if serie_nome:
        q = q.filter(Serie.nome == serie_nome)
    materias = [labels.materia_nome(m) for m in (p.get("materias") or [])]
    if materias:
        q = q.filter(Materia.nome.in_(materias))
    q = aplicar_escopo_questoes(q, usuario)
    candidatas = q.all()

    por_nivel: dict[str, list] = {"facil": [], "medio": [], "dificil": []}
    for qq in candidatas:
        cod = labels.nivel_code(qq.nivel.nome)
        if cod in por_nivel:
            por_nivel[cod].append(qq)

    meta = {k: round((alvo.get(k, 0) / 100) * total) for k in por_nivel}
    selecionadas = (
        por_nivel["facil"][: meta["facil"]]
        + por_nivel["medio"][: meta["medio"]]
        + por_nivel["dificil"][: meta["dificil"]]
    )
    if len(selecionadas) < total:
        ja = {x.id for x in selecionadas}
        selecionadas += [x for x in candidatas if x.id not in ja][
            : total - len(selecionadas)
        ]

    # persiste as questões do simulado
    sessao.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == sim.id
    ).delete()
    for ordem, qq in enumerate(selecionadas):
        sessao.add(
            SimuladoQuestao(
                simulado_id=sim.id,
                questao_id=qq.id,
                ordem_questao=ordem,
                alternativas_ordem=[],
            )
        )
    sim.status = StatusSimulado.GERADO
    sessao.commit()

    n = len(selecionadas) or 1
    dist_real = {
        k: round(
            (sum(1 for x in selecionadas if labels.nivel_code(x.nivel.nome) == k) / n)
            * 100
        )
        for k in ("facil", "medio", "dificil")
    }
    desvio = sum(abs(alvo.get(k, 0) - dist_real[k]) for k in dist_real)
    confianca = max(35, min(95, round(100 - desvio * 1.5)))
    obs = []
    if len(selecionadas) < total:
        obs.append(
            f"Banco escasso — {len(selecionadas)} de {total} questões disponíveis."
        )
    return {
        "curadoria": {
            "confiancaPercentual": confianca,
            "distribuicaoReal": dist_real,
            "tempoCuradoriaSegundos": 0,
            "geradoEm": datetime.now(timezone.utc).isoformat(),
            "tentativas": 1,
            "observacoes": obs,
        },
        "questoesSelecionadas": [_serializar_questao(x) for x in selecionadas],
        "questaoIds": [str(x.id) for x in selecionadas],
    }


@router.post(
    "/gestor/simulados/{simulado_id}/montar", dependencies=[Depends(montadores_prova)]
)
def montar_prova(
    simulado_id: int,
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    """Salva a prova montada manualmente: define a lista EXATA de questões
    (por id, na ordem dada). Aceita rascunhos do próprio autor (sem filtro de
    status). Reusa o padrão de persistência da curadoria."""
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    parametros = corpo.get("parametros")
    if isinstance(parametros, dict) and parametros:
        turma_id_raw = parametros.get("turmaId", sim.turma_id)
        try:
            turma_id = int(turma_id_raw) if turma_id_raw is not None else None
        except (TypeError, ValueError):
            turma_id = None
        _exigir_turma_permitida(sessao, usuario, turma_id)
        sim.turma_id = turma_id
        sim.parametros_json = {**(sim.parametros_json or {}), **parametros}
        sim.titulo = sim.parametros_json.get("nome") or sim.titulo
    ids_raw = corpo.get("questaoIds") or []
    vistos: set[int] = set()
    questoes_ok: list[int] = []
    for x in ids_raw:
        try:
            qid = int(x)
        except (TypeError, ValueError):
            continue
        if qid in vistos:
            continue
        questao = sessao.get(Questao, qid)
        if questao is not None and _questao_permitida_para_prova(sessao, usuario, questao):
            questoes_ok.append(qid)
            vistos.add(qid)
    if not questoes_ok:
        raise HTTPException(
            status_code=422, detail="Informe ao menos uma questão válida (questaoIds)."
        )

    sessao.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == sim.id
    ).delete()
    for ordem, qid in enumerate(questoes_ok):
        sessao.add(
            SimuladoQuestao(
                simulado_id=sim.id,
                questao_id=qid,
                ordem_questao=ordem,
                alternativas_ordem=[],
            )
        )
    sim.status = StatusSimulado.GERADO
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="montar_simulado",
        alvo_tipo="simulado",
        alvo_id=sim.id,
        detalhes=f"Associou {len(questoes_ok)} questoes ao simulado {sim.titulo}.",
        request=request,
    )
    sessao.commit()
    return {
        "id": str(sim.id),
        "status": _status_simulado_front(sim.status),
        "totalQuestoes": len(questoes_ok),
        "questaoIds": [str(q) for q in questoes_ok],
    }


@router.post(
    "/gestor/simulados/{simulado_id}/liberar", dependencies=[Depends(montadores_prova)]
)
def liberar_simulado(
    simulado_id: int,
    request: Request,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    sim.status = StatusSimulado.LIBERADO
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="liberar_simulado",
        alvo_tipo="simulado",
        alvo_id=sim.id,
        detalhes=f"Liberou simulado {sim.titulo}.",
        request=request,
    )
    sessao.commit()
    return {
        "id": str(sim.id),
        "status": "liberado",
        "liberadoEm": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/gestor/simulados/{simulado_id}/acompanhar", dependencies=[Depends(montadores_prova)]
)
def acompanhar_simulado(
    simulado_id: int,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    total_q = len(sim.questoes)
    respostas = sessao.scalars(
        select(Resposta).where(Resposta.simulado_id == sim.id)
    ).all()
    por_aluno: dict[int, int] = {}
    for r in respostas:
        por_aluno[r.aluno_id] = por_aluno.get(r.aluno_id, 0) + 1

    agora = datetime.now(timezone.utc).isoformat()
    alunos = []
    for a in _alunos_do_simulado(sim):
        respondidas = por_aluno.get(a.id, 0)
        if respondidas == 0:
            status = "nao_iniciou"
        elif total_q and respondidas >= total_q:
            status = "finalizado"
        else:
            status = "em_andamento"
        alunos.append(
            {
                "alunoId": str(a.id),
                "nome": a.usuario.nome if a.usuario else "Aluno",
                "fotoUrl": a.usuario.foto_url if a.usuario else None,
                "status": status,
                "questaoAtualIndice": min(respondidas, total_q),
                "totalQuestoes": total_q,
                "tempoRestanteSegundos": 0,
                "conexaoOk": True,
                "ultimaAtividadeEm": agora,
            }
        )
    contagens = {
        st: sum(1 for x in alunos if x["status"] == st)
        for st in ("nao_iniciou", "em_andamento", "finalizado", "desconectou")
    }
    contagens["total"] = len(alunos)
    return {
        "simulado": _serializar_simulado(sim),
        "alunos": alunos,
        "contagens": contagens,
        "tempoLimiteMinutos": _normalizar_parametros_simulado(sim).get("tempoLimiteMinutos", 0),
    }


@router.get(
    "/gestor/simulados/{simulado_id}/relatorio", dependencies=[Depends(montadores_prova)]
)
def relatorio_simulado(
    simulado_id: int,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    alunos_turma = _alunos_do_simulado(sim)
    tabela = []
    notas = []
    for a in alunos_turma:
        r = _computar_resultado(sessao, a.id, sim)
        if r is None:
            continue
        notas.append(r["notaFinal"])
        tabela.append(
            {
                "alunoId": str(a.id),
                "alunoNome": a.usuario.nome if a.usuario else "",
                "fotoUrl": a.usuario.foto_url if a.usuario else None,
                "adaptacoes": a.perfil_cognitivo or [],
                "notaFinal": r["notaFinal"],
                "acertos": r["acertos"],
                "erros": r["erros"],
                "emBranco": r["emBranco"],
                "tempoTotalSegundos": r["tempoTotalSegundos"],
                "emRisco": a.necessita_suporte,
            }
        )
    panorama = {
        "media": round(sum(notas) / len(notas), 1) if notas else 0.0,
        "maior": max(notas) if notas else 0.0,
        "menor": min(notas) if notas else 0.0,
        "taxaConclusao": round(len(tabela) / len(alunos_turma), 2) if alunos_turma else 0.0,
        "totalRespostas": len(tabela),
    }
    competencias = _competencias_simulado(sessao, sim)
    fortes = [c for c in competencias if c["taxaAcerto"] >= 0.7]
    atencao = [c for c in competencias if c["taxaAcerto"] < 0.5]
    media = panorama["media"]
    if media >= 7:
        resumo = f"Turma com bom desempenho (média {media}). Mantém o ritmo."
    elif media >= 5:
        resumo = f"Desempenho mediano (média {media}). Há espaço para reforço."
    else:
        resumo = f"Desempenho abaixo do esperado (média {media}). Requer atenção."
    diagnostico = {
        "id": f"diag_{sim.id}",
        "simuladoId": str(sim.id),
        "resumoExecutivo": resumo,
        "pontosFortes": [
            f"{c['competencia']} ({round(c['taxaAcerto'] * 100)}% de acerto)"
            for c in fortes[:4]
        ],
        "pontosAtencao": [
            f"{c['competencia']} ({round(c['taxaAcerto'] * 100)}% de acerto)"
            for c in atencao[:4]
        ],
        "recomendacoesPedagogicas": [
            f"Reforçar {c['competencia']} com atividades dirigidas." for c in atencao[:4]
        ],
        "geradoEm": datetime.now(timezone.utc).isoformat(),
        "modeloUsado": "heuristica",
        "confiancaPercentual": min(95, 40 + panorama["totalRespostas"] * 5),
    }
    sugestoes = [
        {
            "competencia": c["competencia"],
            "conteudo": c["competencia"],
            "tipoMaterial": "exercicio",
            "descricao": f"Lista de exercícios focada em {c['competencia']}.",
        }
        for c in atencao[:4]
    ]
    return {
        "simulado": _serializar_simulado(sim),
        "panorama": panorama,
        "diagnostico": diagnostico,
        "competencias": competencias,
        "tabela": tabela,
        "sugestoes": sugestoes,
    }


@router.post("/admin/questoes/importar", dependencies=[Depends(so_admin)])
def importar_questoes(
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    """Importação REAL de questões: recebe um array `questoes` (formato do
    front, com codes), valida e insere cada uma no banco; coleta as rejeitadas.
    Sem `questoes` no corpo é no-op (a leitura/parse do arquivo é frontend)."""
    iniciado = datetime.now(timezone.utc)
    questoes = corpo.get("questoes") or []
    importadas = 0
    rejeitadas = []
    for i, q in enumerate(questoes, start=1):
        try:
            alts = q.get("alternativas") or []
            questao_service.cadastrar_questao(
                sessao,
                enunciado=q.get("enunciado", ""),
                serie=labels.serie_nome(q.get("serie")) or "",
                materia=labels.materia_nome(q.get("materia", "")),
                conteudo=q.get("conteudo", ""),
                nivel=labels.MAP_NIVEL.get(q.get("nivel"), q.get("nivel", "")),
                alternativas=[
                    {"texto": a.get("texto"), "correta": bool(a.get("correta"))}
                    for a in alts
                ],
                adaptacoes=q.get("adaptacoes", []),
                imagem_url=q.get("imagemUrl"),
            )
            importadas += 1
        except ValueError as exc:
            rejeitadas.append(
                {
                    "linha": i,
                    "campo": "questao",
                    "motivo": str(exc),
                    "valor": (q.get("enunciado") or "")[:40],
                }
            )
        except Exception:
            sessao.rollback()
            rejeitadas.append(
                {"linha": i, "campo": "questao", "motivo": "erro inesperado", "valor": None}
            )
    total = int(corpo.get("totalLinhas") or len(questoes))
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="importacao",
        alvo_tipo="questao",
        alvo_id=None,
        detalhes=f"Importou questoes: {importadas} aceitas, {len(rejeitadas)} rejeitadas.",
        request=request,
    )
    sessao.commit()
    return {
        "totalLinhas": total,
        "importadas": importadas,
        "rejeitadas": rejeitadas,
        "iniciadoEm": iniciado.isoformat(),
        "finalizadoEm": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# ALUNO — execução do simulado (iniciar / responder / finalizar)
# ---------------------------------------------------------------------------


@router.post("/aluno/simulado/{simulado_id}/iniciar")
def aluno_iniciar(
    simulado_id: int,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = _aluno_do_usuario(usuario)
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_aluno_simulado_v2(sessao, aluno, sim)
    tempo = int(_normalizar_parametros_simulado(sim).get("tempoLimiteMinutos", 60)) * 60
    agora = datetime.now(timezone.utc).isoformat()
    return {
        "simuladoId": str(sim.id),
        "alunoId": str(aluno.id),
        "questaoAtualIndice": 0,
        "iniciadoEm": agora,
        "ultimaAtividadeEm": agora,
        "tempoRestanteSegundos": tempo,
        "status": "em_andamento",
        "conexaoOk": True,
    }


@router.patch("/aluno/simulado/{simulado_id}/responder")
def aluno_responder(
    simulado_id: int,
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    """Autosave: grava/atualiza a Resposta do aluno (correta vinda do gabarito)."""
    aluno = _aluno_do_usuario(usuario)
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_aluno_simulado_v2(sessao, aluno, sim)
    try:
        questao_id = int(corpo.get("questaoId"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="questaoId inválido.") from exc
    if questao_id not in {sq.questao_id for sq in sim.questoes}:
        raise HTTPException(status_code=403, detail="Questão fora deste simulado.")

    alt_raw = corpo.get("alternativaId")
    agora = datetime.now(timezone.utc)
    if alt_raw:
        alternativa_id = int(alt_raw)
        alt = sessao.get(Alternativa, alternativa_id)
        if alt is None or alt.questao_id != questao_id:
            raise HTTPException(status_code=400, detail="Alternativa inválida para a questão.")
        correta = bool(alt.correta) if alt else False
        existente = sessao.scalar(
            select(Resposta).where(
                Resposta.aluno_id == aluno.id,
                Resposta.simulado_id == simulado_id,
                Resposta.questao_id == questao_id,
            )
        )
        if existente:
            existente.alternativa_id = alternativa_id
            existente.correta = correta
            existente.respondida_em = agora
        else:
            sessao.add(
                Resposta(
                    aluno_id=aluno.id,
                    simulado_id=simulado_id,
                    questao_id=questao_id,
                    alternativa_id=alternativa_id,
                    correta=correta,
                    respondida_em=agora,
                )
            )
        auditoria_service.registrar(
            sessao,
            usuario=usuario,
            tipo="responder_questao",
            alvo_tipo="simulado",
            alvo_id=simulado_id,
            detalhes=f"Aluno #{aluno.id} respondeu questao #{questao_id}.",
            request=request,
        )
        sessao.commit()

    return {
        "questaoId": str(questao_id),
        "alternativaId": str(alt_raw) if alt_raw else None,
        "status": "respondida" if alt_raw else "em_branco",
        "tempoGastoSegundos": 0,
        "trocasDeResposta": 0,
        "respondidaEm": agora.isoformat(),
    }


@router.post("/aluno/simulado/{simulado_id}/finalizar")
def aluno_finalizar(
    simulado_id: int,
    request: Request,
    corpo: dict | None = None,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = _aluno_do_usuario(usuario)
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_aluno_simulado_v2(sessao, aluno, sim, exigir_liberado=False)
    for resposta in (corpo or {}).get("respostas", []) or []:
        alt_raw = resposta.get("alternativaId")
        if not alt_raw:
            continue
        try:
            questao_id = int(resposta.get("questaoId"))
            alternativa_id = int(alt_raw)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Resposta invalida.") from exc
        if questao_id not in {sq.questao_id for sq in sim.questoes}:
            raise HTTPException(status_code=403, detail="Questao fora deste simulado.")
        alt = sessao.get(Alternativa, alternativa_id)
        if alt is None or alt.questao_id != questao_id:
            raise HTTPException(status_code=400, detail="Alternativa invalida para a questao.")
        correta = bool(alt.correta)
        existente = sessao.scalar(
            select(Resposta).where(
                Resposta.aluno_id == aluno.id,
                Resposta.simulado_id == simulado_id,
                Resposta.questao_id == questao_id,
            )
        )
        agora_resposta = datetime.now(timezone.utc)
        if existente:
            existente.alternativa_id = alternativa_id
            existente.correta = correta
            existente.respondida_em = agora_resposta
        else:
            sessao.add(
                Resposta(
                    aluno_id=aluno.id,
                    simulado_id=simulado_id,
                    questao_id=questao_id,
                    alternativa_id=alternativa_id,
                    correta=correta,
                    respondida_em=agora_resposta,
                )
            )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="finalizar_respostas",
        alvo_tipo="simulado",
        alvo_id=simulado_id,
        detalhes=f"Aluno #{aluno.id} finalizou respostas do simulado #{simulado_id}.",
        request=request,
    )
    _marcar_simulado_finalizado_para_aluno(sessao, aluno, sim)
    sessao.commit()
    resultado = _computar_resultado(sessao, aluno.id, sim, incluir_sem_respostas=True)
    if resultado is None:
        agora = datetime.now(timezone.utc).isoformat()
        resultado = {
            "id": f"res_{aluno.id}_{sim.id}",
            "simuladoId": str(sim.id),
            "alunoId": str(aluno.id),
            "respostas": [],
            "notaFinal": 0.0,
            "acertos": 0,
            "erros": 0,
            "emBranco": len(sim.questoes),
            "tempoTotalSegundos": 0,
            "iniciadoEm": agora,
            "finalizadoEm": agora,
            "desempenhoPorCompetencia": [],
        }
    return resultado


# ---------------------------------------------------------------------------
# SUPORTE — nota e pedido de apoio presencial (persistem no aluno)
# ---------------------------------------------------------------------------


@router.post(
    "/suporte/aluno/{usuario_id}/nota", dependencies=[Depends(admin_gestor_suporte)]
)
def suporte_nota(
    usuario_id: int,
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(admin_gestor_suporte),
    sessao: Session = Depends(get_session),
) -> dict:
    alvo = sessao.get(Usuario, usuario_id)
    if alvo is None or alvo.aluno is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    _exigir_aluno_suporte_visivel(usuario, alvo.aluno)
    texto = (corpo.get("texto") or "").strip()
    if len(texto) < 3:
        raise HTTPException(status_code=400, detail="Texto da nota é obrigatório.")
    a = alvo.aluno
    carimbo = datetime.now(timezone.utc)
    linha = f"[{carimbo.date().isoformat()}] {texto}"
    a.observacoes_suporte = (
        f"{a.observacoes_suporte}\n{linha}" if a.observacoes_suporte else linha
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="registrar_nota_suporte",
        alvo_tipo="aluno",
        alvo_id=a.id,
        detalhes=f"Registrou nota de suporte para {alvo.nome}.",
        request=request,
    )
    sessao.commit()
    return {
        "id": f"nota_{a.id}_{int(carimbo.timestamp())}",
        "alunoId": str(usuario_id),
        "texto": texto,
        "registradaEm": carimbo.isoformat(),
    }


@router.post(
    "/suporte/aluno/{usuario_id}/apoio-presencial",
    dependencies=[Depends(admin_gestor_suporte)],
)
def suporte_apoio_presencial(
    usuario_id: int,
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(admin_gestor_suporte),
    sessao: Session = Depends(get_session),
) -> dict:
    alvo = sessao.get(Usuario, usuario_id)
    if alvo is None or alvo.aluno is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    _exigir_aluno_suporte_visivel(usuario, alvo.aluno)
    alvo.aluno.avaliacao_suporte_pendente = True
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="solicitar_apoio_presencial",
        alvo_tipo="aluno",
        alvo_id=alvo.aluno.id,
        detalhes=f"Solicitou apoio presencial para {alvo.nome}.",
        request=request,
    )
    sessao.commit()
    return {
        "id": f"apoio_{alvo.aluno.id}",
        "alunoId": str(usuario_id),
        "motivo": corpo.get("motivo") or "Apoio solicitado pelo professor de suporte.",
        "solicitadoEm": datetime.now(timezone.utc).isoformat(),
        "status": "aguardando",
    }
