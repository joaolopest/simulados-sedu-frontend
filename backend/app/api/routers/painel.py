"""Endpoints agregados das telas (dashboards por papel).

Diferente dos demais routers (orientados a recurso), aqui montamos respostas
no formato que cada tela do front espera (camelCase) — funcionam como BFF do
lado do servidor. Valores sem origem no banco (deltas semana-a-semana, insights
de IA) vêm zerados/vazios e estão sinalizados.
"""

import csv
import random
from datetime import datetime, timedelta, timezone
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
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
from app.services import (
    auditoria_service,
    configuracao_service,
    metricas_questoes_service,
    prova_avancada_service,
    questao_service,
    simulado_service,
)
from app.models import (
    Aluno,
    Alternativa,
    Conteudo,
    Escola,
    GuiaEstudo,
    Materia,
    Nivel,
    Questao,
    Resposta,
    ResultadoSimulado,
    Serie,
    Simulado,
    SimuladoInscricao,
    SimuladoQuestao,
    SimuladoSnapshot,
    SimuladoTentativa,
    Turma,
    Usuario,
    ProvaTemplate,
    RevisaoQuestao,
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


def _ids_questoes_excluidas(parametros: dict) -> set[int]:
    ids: set[int] = set()
    for chave in ("excluirQuestaoIds", "questoesIgnoradas", "questaoIdsIgnoradas"):
        for valor in _lista_unica(parametros.get(chave)):
            try:
                ids.add(int(valor))
            except (TypeError, ValueError):
                continue
    return ids


def _embaralhar_questoes(questoes: list[Questao], parametros: dict) -> list[Questao]:
    itens = list(questoes)
    seed = parametros.get("seed") or parametros.get("semente")
    if seed is not None:
        random.Random(str(seed)).shuffle(itens)
    else:
        random.shuffle(itens)
    return itens


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


def _config_provas(sessao: Session) -> dict:
    return configuracao_service.config_provas(sessao)


def _config_acessibilidade(sessao: Session) -> dict:
    return configuracao_service.config_acessibilidade(sessao)


def _normalizar_adaptacao_aluno(codigo: object) -> str | None:
    texto = str(codigo or "").strip().lower()
    if not texto:
        return None
    if texto == "baixa_visao":
        return "deficiencia_visual"
    return texto


def _adaptacoes_aluno(aluno: Aluno) -> list[str]:
    adaptacoes: list[str] = []
    for item in aluno.perfil_cognitivo or []:
        codigo = _normalizar_adaptacao_aluno(item)
        if codigo and codigo not in adaptacoes:
            adaptacoes.append(codigo)
    return adaptacoes


def _tempo_base_simulado_segundos(simulado: Simulado) -> int:
    minutos = _inteiro_positivo(
        _normalizar_parametros_simulado(simulado).get("tempoLimiteMinutos"), 60,
    )
    return max(1, minutos) * 60


def _acessibilidade_aluno_simulado(
    sessao: Session, aluno: Aluno, simulado: Simulado
) -> dict:
    config = _config_acessibilidade(sessao)
    adaptacoes_config = config.get("adaptacoesDisponiveis") or []
    disponiveis = {
        codigo
        for codigo in (_normalizar_adaptacao_aluno(item) for item in adaptacoes_config)
        if codigo
    }
    adaptacoes = _adaptacoes_aluno(aluno)
    adaptacoes_aplicaveis = [
        codigo for codigo in adaptacoes if not disponiveis or codigo in disponiveis
    ]
    tem_adaptacao = bool(aluno.necessita_suporte or adaptacoes_aplicaveis or adaptacoes)
    percentual = _inteiro_positivo(config.get("tempoExtraPercentualPadrao"), 25)
    percentual = min(percentual, 200) if tem_adaptacao else 0
    tempo_base = _tempo_base_simulado_segundos(simulado)
    tempo_total = int(round(tempo_base * (1 + percentual / 100)))
    tempo_extra = max(0, tempo_total - tempo_base)

    return {
        "temAdaptacao": tem_adaptacao,
        "adaptacoes": adaptacoes_aplicaveis or adaptacoes,
        "tempoBaseSegundos": tempo_base,
        "tempoExtraPercentual": percentual,
        "tempoExtraAplicado": tempo_extra,
        "tempoTotalSegundos": tempo_total,
        "recursos": {
            "fonteMaior": bool(tem_adaptacao and config.get("permitirFonteMaior")),
            "altoContraste": bool(tem_adaptacao and config.get("permitirAltoContraste")),
            "leituraSimplificada": bool(
                tem_adaptacao and config.get("permitirLeituraSimplificada")
            ),
        },
    }


def _limites_prova(sessao: Session) -> tuple[int, int]:
    config = _config_provas(sessao)
    minimo = _inteiro_positivo(config.get("quantidadeMinimaQuestoes"), 3)
    maximo = _inteiro_positivo(config.get("quantidadeMaximaQuestoes"), 100)
    return max(1, minimo), max(maximo, minimo)


def _aplicar_defaults_parametros_prova(sessao: Session, parametros: dict) -> dict:
    config = _config_provas(sessao)
    saida = dict(parametros or {})
    if not saida.get("tempoLimiteMinutos"):
        saida["tempoLimiteMinutos"] = _inteiro_positivo(
            config.get("tempoPadraoMinutos"), 60,
        )
    return saida


def _validar_parametros_quantidade_prova(sessao: Session, parametros: dict) -> None:
    minimo, maximo = _limites_prova(sessao)
    valor_quantidade = parametros.get("quantidadeQuestoes", parametros.get("quantidade"))
    if valor_quantidade is None:
        return
    quantidade = _inteiro_positivo(valor_quantidade, 0)
    if quantidade < minimo:
        raise HTTPException(
            status_code=422,
            detail={
                "codigo": "QUESTOES_ABAIXO_DO_MINIMO",
                "mensagem": f"A prova precisa ter pelo menos {minimo} questoes.",
                "totalAtual": quantidade,
                "minimo": minimo,
            },
        )
    if quantidade > maximo:
        raise HTTPException(
            status_code=422,
            detail={
                "codigo": "QUESTOES_ACIMA_DO_MAXIMO",
                "mensagem": f"A prova nao pode ter mais de {maximo} questoes.",
                "totalAtual": quantidade,
                "maximo": maximo,
            },
        )


def _validar_simulado_com_config(sessao: Session, simulado: Simulado) -> dict:
    minimo, maximo = _limites_prova(sessao)
    return prova_avancada_service.validar_simulado(
        simulado,
        quantidade_minima_questoes=minimo,
        quantidade_maxima_questoes=maximo,
    )


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


def _serializar_resultado_persistido(persistido: ResultadoSimulado) -> dict:
    dados = dict(persistido.resultado_json or {})
    tentativa = persistido.tentativa
    iniciado_em = tentativa.iniciado_em if tentativa else None
    finalizado_em = tentativa.finalizado_em if tentativa else None

    dados.setdefault(
        "id",
        f"res_{persistido.aluno_id}_{persistido.simulado_id}_{persistido.tentativa_id}",
    )
    dados.setdefault("simuladoId", str(persistido.simulado_id))
    dados.setdefault("alunoId", str(persistido.aluno_id))
    dados.setdefault("tentativaId", str(persistido.tentativa_id))
    if tentativa is not None:
        dados.setdefault("tentativaNumero", tentativa.numero)
        dados.setdefault("statusTentativa", tentativa.status)
        dados.setdefault("motivoReabertura", tentativa.motivo_reabertura)
    dados.setdefault("respostas", [])
    dados.setdefault("notaFinal", persistido.nota_final)
    dados.setdefault("preenchidas", persistido.preenchidas)
    dados.setdefault("acertos", persistido.acertos)
    dados.setdefault("erros", persistido.erros)
    dados.setdefault("emBranco", persistido.em_branco)
    dados.setdefault("tempoTotalSegundos", persistido.tempo_total_segundos)
    if not dados.get("iniciadoEm"):
        dados["iniciadoEm"] = (
            iniciado_em.isoformat()
            if iniciado_em
            else persistido.criado_em.isoformat()
        )
    if not dados.get("finalizadoEm"):
        dados["finalizadoEm"] = (
            finalizado_em.isoformat()
            if finalizado_em
            else persistido.criado_em.isoformat()
        )
    dados.setdefault("totalQuestoes", persistido.preenchidas + persistido.em_branco)
    dados.setdefault("desempenhoPorCompetencia", [])
    dados.setdefault("desempenhoPorConteudo", [])
    dados.setdefault("desempenhoPorNivel", [])
    dados.setdefault("questoesResumo", [])
    return dados


def _rotulo_competencia(valor: object) -> str:
    if isinstance(valor, dict):
        for chave in ("nome", "titulo", "codigo", "id"):
            bruto = valor.get(chave)
            if bruto:
                return str(bruto)
    texto = str(valor or "").strip()
    return texto or "Sem competencia cadastrada"


def _nova_metrica() -> dict:
    return {
        "totalQuestoes": 0,
        "preenchidas": 0,
        "acertos": 0,
        "erros": 0,
        "emBranco": 0,
        "tempoTotalSegundos": 0,
    }


def _somar_metrica(mapa: dict[str, dict], chave: str, *, respondida: bool, correta: bool, tempo: int) -> None:
    item = mapa.setdefault(chave, _nova_metrica())
    item["totalQuestoes"] += 1
    item["tempoTotalSegundos"] += max(0, int(tempo or 0))
    if not respondida:
        item["emBranco"] += 1
        return
    item["preenchidas"] += 1
    if correta:
        item["acertos"] += 1
    else:
        item["erros"] += 1


def _metricas_ordenadas(mapa: dict[str, dict], campo: str) -> list[dict]:
    saida: list[dict] = []
    for chave, item in sorted(mapa.items(), key=lambda par: par[0].lower()):
        total = int(item["totalQuestoes"] or 0)
        acertos = int(item["acertos"] or 0)
        tempo_total = int(item["tempoTotalSegundos"] or 0)
        linha = {
            campo: chave,
            "rotulo": chave,
            "totalQuestoes": total,
            "preenchidas": int(item["preenchidas"] or 0),
            "acertos": acertos,
            "erros": int(item["erros"] or 0),
            "emBranco": int(item["emBranco"] or 0),
            "taxaAcerto": round(acertos / total, 2) if total else 0.0,
            "tempoMedioSegundos": round(tempo_total / total) if total else 0,
        }
        if campo == "competencia":
            linha["mediaEstadual"] = 0.0
        saida.append(linha)
    return saida


def _desempenho_pedagogico(simulado: Simulado, respostas: list[Resposta]) -> dict:
    respostas_por_questao = {r.questao_id: r for r in respostas}
    competencias: dict[str, dict] = {}
    conteudos: dict[str, dict] = {}
    niveis: dict[str, dict] = {}
    resumo_questoes: list[dict] = []

    for ordem, sq in enumerate(sorted(simulado.questoes, key=lambda x: x.ordem_questao), start=1):
        q = sq.questao
        if q is None:
            continue
        resposta = respostas_por_questao.get(q.id)
        respondida = bool(
            resposta
            and resposta.status == "respondida"
            and resposta.alternativa_id is not None
        )
        correta = bool(resposta.correta) if respondida and resposta else False
        tempo = int(resposta.tempo_gasto_segundos or 0) if resposta else 0
        status = "acerto" if correta else ("erro" if respondida else "em_branco")

        comps = [_rotulo_competencia(c) for c in (q.competencias or [])]
        if not comps:
            comps = ["Sem competencia cadastrada"]
        conteudo = q.conteudo.nome if q.conteudo else "Sem conteudo cadastrado"
        nivel = q.nivel.nome if q.nivel else "Sem nivel cadastrado"

        for comp in comps:
            _somar_metrica(competencias, comp, respondida=respondida, correta=correta, tempo=tempo)
        _somar_metrica(conteudos, conteudo, respondida=respondida, correta=correta, tempo=tempo)
        _somar_metrica(niveis, nivel, respondida=respondida, correta=correta, tempo=tempo)

        resumo_questoes.append(
            {
                "questaoId": str(q.id),
                "ordem": ordem,
                "status": status,
                "correta": correta,
                "respondida": respondida,
                "conteudo": conteudo,
                "nivel": nivel,
                "competencias": comps,
                "tempoGastoSegundos": tempo,
            }
        )

    return {
        "desempenhoPorCompetencia": _metricas_ordenadas(competencias, "competencia"),
        "desempenhoPorConteudo": _metricas_ordenadas(conteudos, "conteudo"),
        "desempenhoPorNivel": _metricas_ordenadas(niveis, "nivel"),
        "questoesResumo": resumo_questoes,
    }


def _computar_resultado(
    sessao: Session,
    aluno_id: int,
    simulado: Simulado,
    *,
    incluir_sem_respostas: bool = False,
    usar_persistido: bool = True,
    tentativa_atual: SimuladoTentativa | None = None,
) -> dict | None:
    """Calcula o ResultadoSimulado do aluno a partir das respostas no banco."""
    if usar_persistido:
        persistido = prova_avancada_service.resultado_persistido(
            sessao, simulado_id=simulado.id, aluno_id=aluno_id,
        )
        if persistido is not None:
            return _serializar_resultado_persistido(persistido)

    ids_questoes = {sq.questao_id for sq in simulado.questoes}
    tentativa = tentativa_atual or prova_avancada_service.tentativa_mais_recente(
        sessao, simulado_id=simulado.id, aluno_id=aluno_id,
    )
    consulta_respostas = select(Resposta).where(
        Resposta.aluno_id == aluno_id,
        Resposta.simulado_id == simulado.id,
    )
    if tentativa is not None:
        consulta_respostas = consulta_respostas.where(
            Resposta.tentativa_id == tentativa.id,
        )
    else:
        consulta_respostas = consulta_respostas.where(Resposta.tentativa_id.is_(None))
    respostas = sessao.scalars(consulta_respostas).all()
    # Conta só respostas de questões que AINDA estão na prova — evita contagem
    # inflada de erros se uma questão foi removida da prova após ser respondida.
    respostas = [r for r in respostas if r.questao_id in ids_questoes]
    if not respostas and not incluir_sem_respostas:
        return None
    total_questoes = len(ids_questoes)
    respondidas_lista = [
        r for r in respostas if r.status == "respondida" and r.alternativa_id is not None
    ]
    ids_com_resposta = {r.questao_id for r in respostas}
    acertos = sum(1 for r in respondidas_lista if r.correta)
    respondidas = len(respondidas_lista)
    erros = respondidas - acertos
    brancos_explicitos = sum(
        1 for r in respostas if r.status == "em_branco" or r.alternativa_id is None
    )
    em_branco = brancos_explicitos + max(0, total_questoes - len(ids_com_resposta))
    nota = round((acertos / total_questoes) * 10, 1) if total_questoes else 0.0
    _tempos = [r.respondida_em for r in respostas if r.respondida_em]
    primeira = min(_tempos) if _tempos else None
    ultima = max(_tempos) if _tempos else None
    inscricao = _inscricao_simulado_aluno(sessao, aluno_id, simulado.id)
    finalizado_em = (
        (tentativa.finalizado_em if tentativa and tentativa.finalizado_em else None)
        or ultima
        or (inscricao.inscrito_em if inscricao and inscricao.status == "finalizado" else None)
        or simulado.criado_em
    )
    # Tempo real gasto = da 1ª à última resposta (autosave grava cada uma na hora).
    tempo_total = sum(int(r.tempo_gasto_segundos or 0) for r in respostas)
    desempenho = _desempenho_pedagogico(simulado, respostas)
    return {
        "id": f"res_{aluno_id}_{simulado.id}_{tentativa.id if tentativa else 'legacy'}",
        "simuladoId": str(simulado.id),
        "alunoId": str(aluno_id),
        "tentativaId": str(tentativa.id) if tentativa else None,
        "tentativaNumero": tentativa.numero if tentativa else None,
        "statusTentativa": tentativa.status if tentativa else None,
        "respostas": [
            {
                "questaoId": str(r.questao_id),
                "alternativaId": str(r.alternativa_id) if r.alternativa_id else None,
                "status": r.status or ("respondida" if r.alternativa_id else "em_branco"),
                "tempoGastoSegundos": int(r.tempo_gasto_segundos or 0),
                "trocasDeResposta": int(r.trocas_de_resposta or 0),
                "respondidaEm": r.respondida_em.isoformat() if r.respondida_em else None,
            }
            for r in respostas
        ],
        "notaFinal": nota,
        "totalQuestoes": total_questoes,
        "preenchidas": respondidas,
        "acertos": acertos,
        "erros": erros,
        "emBranco": em_branco,
        "tempoTotalSegundos": tempo_total,
        "iniciadoEm": primeira.isoformat() if primeira else (finalizado_em.isoformat() if finalizado_em else None),
        "finalizadoEm": finalizado_em.isoformat() if finalizado_em else None,
        **desempenho,
    }


def _normalizar_tempo_gasto(valor: object) -> int:
    try:
        segundos = int(valor) if valor is not None else 0
    except (TypeError, ValueError):
        return 0
    return max(0, min(segundos, 24 * 60 * 60))


def _salvar_resposta_aluno(
    sessao: Session,
    *,
    aluno: Aluno,
    simulado: Simulado,
    tentativa: SimuladoTentativa,
    questao_id: int,
    alternativa_raw: object,
    tempo_gasto: int,
) -> Resposta:
    if questao_id not in {sq.questao_id for sq in simulado.questoes}:
        raise HTTPException(status_code=403, detail="Questao fora deste simulado.")

    alternativa_id: int | None = None
    correta = False
    status = "em_branco"
    if alternativa_raw:
        try:
            alternativa_id = int(alternativa_raw)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Alternativa invalida.") from exc
        alt = sessao.get(Alternativa, alternativa_id)
        if alt is None or alt.questao_id != questao_id:
            raise HTTPException(status_code=400, detail="Alternativa invalida para a questao.")
        correta = bool(alt.correta)
        status = "respondida"

    existente = sessao.scalar(
        select(Resposta).where(
            Resposta.aluno_id == aluno.id,
            Resposta.simulado_id == simulado.id,
            Resposta.questao_id == questao_id,
            Resposta.tentativa_id == tentativa.id,
        )
    )
    agora = datetime.now(timezone.utc)
    if existente:
        if existente.alternativa_id is not None and existente.alternativa_id != alternativa_id:
            existente.trocas_de_resposta = int(existente.trocas_de_resposta or 0) + 1
        existente.tentativa_id = tentativa.id
        existente.alternativa_id = alternativa_id
        existente.correta = correta
        existente.status = status
        existente.respondida_em = agora
        existente.tempo_gasto_segundos = tempo_gasto
        return existente

    resposta = Resposta(
        tentativa_id=tentativa.id,
        aluno_id=aluno.id,
        simulado_id=simulado.id,
        questao_id=questao_id,
        alternativa_id=alternativa_id,
        correta=correta,
        status=status,
        respondida_em=agora,
        tempo_gasto_segundos=tempo_gasto,
    )
    sessao.add(resposta)
    sessao.flush()
    return resposta


def _serializar_questao_para_aluno(questao: Questao, *, incluir_gabarito: bool = False) -> dict:
    dados = _serializar_questao(questao)
    if incluir_gabarito:
        return dados
    dados.pop("explicacao", None)
    for alternativa in dados.get("alternativas", []) or []:
        if isinstance(alternativa, dict):
            alternativa.pop("correta", None)
    return dados


def _config_resultados(sessao: Session) -> dict:
    return configuracao_service.obter_valor(sessao, "resultados")


def _resultado_sem_gabarito(resultado: dict) -> dict:
    dados = dict(resultado or {})
    dados["questoesResumo"] = []
    return dados


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
    tentativa = prova_avancada_service.tentativa_mais_recente(
        sessao, simulado_id=simulado.id, aluno_id=aluno.id,
    )
    resultado = prova_avancada_service.resultado_persistido(
        sessao, simulado_id=simulado.id, aluno_id=aluno.id,
    )
    if tentativa is not None and tentativa.status in {
        "nao_iniciado",
        "em_andamento",
        "reaberta",
    }:
        return False
    return (
        (inscricao is not None and inscricao.status == "finalizado")
        or (tentativa is not None and tentativa.status == "finalizada")
        or resultado is not None
    )


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
        if inscricao.status in {"inscrito", "em_andamento", "reaberto", "finalizado"} and inscricao.aluno:
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


def _qualidade_acervo_admin(sessao: Session) -> dict:
    status_linhas = sessao.execute(
        select(Questao.status, func.count(Questao.id)).group_by(Questao.status)
    ).all()
    por_status = {
        (status.value if hasattr(status, "value") else str(status)): int(total or 0)
        for status, total in status_linhas
    }
    questoes = sessao.scalars(select(Questao).order_by(Questao.id)).all()
    metricas = metricas_questoes_service.metricas_por_questoes(sessao, list(questoes))
    total = len(questoes)
    com_alertas = 0
    sem_respostas = 0
    soma_taxa = 0.0
    alertas: dict[str, int] = {}
    for item in metricas.values():
        soma_taxa += float(item.get("taxa_acerto") or 0)
        if int(item.get("total_respostas") or 0) == 0:
            sem_respostas += 1
        if item.get("alertas"):
            com_alertas += 1
        for alerta in item.get("alertas") or []:
            alertas[alerta] = alertas.get(alerta, 0) + 1

    alertas_ordenados = sorted(
        [{"codigo": codigo, "total": total} for codigo, total in alertas.items()],
        key=lambda item: item["total"],
        reverse=True,
    )
    return {
        "totalQuestoes": total,
        "publicadas": por_status.get("publicada", 0),
        "rascunhos": por_status.get("rascunho", 0),
        "emRevisao": por_status.get("em_revisao", 0),
        "arquivadas": por_status.get("arquivada", 0),
        "comAlertas": com_alertas,
        "semRespostas": sem_respostas,
        "taxaMediaAcerto": round(soma_taxa / total, 4) if total else 0.0,
        "principaisAlertas": alertas_ordenados[:5],
    }


def _insights_admin(qualidade: dict, alunos_em_risco: int, simulados_no_mes: int) -> list[dict]:
    agora = datetime.now(timezone.utc).isoformat()
    insights: list[dict] = []
    if qualidade["comAlertas"] > 0:
        insights.append(
            {
                "id": "qualidade-acervo",
                "tipo": "qualidade",
                "titulo": "Curadoria do acervo",
                "texto": (
                    f"{qualidade['comAlertas']} questões têm alerta de qualidade. "
                    "Priorize gabarito, taxa de acerto extrema, brancos e distratores."
                ),
                "criadoEm": agora,
            }
        )
    if qualidade["semRespostas"] > 0:
        insights.append(
            {
                "id": "questoes-sem-amostra",
                "tipo": "amostra",
                "titulo": "Questões sem amostra real",
                "texto": (
                    f"{qualidade['semRespostas']} questões ainda não têm respostas. "
                    "Use-as em provas piloto antes de tirar conclusões pedagógicas."
                ),
                "criadoEm": agora,
            }
        )
    if alunos_em_risco > 0:
        insights.append(
            {
                "id": "alunos-em-risco",
                "tipo": "risco",
                "titulo": "Atenção a alunos em risco",
                "texto": (
                    f"{alunos_em_risco} alunos estão abaixo do limiar de desempenho. "
                    "Cruze turma, conteúdo e adaptações antes da próxima aplicação."
                ),
                "criadoEm": agora,
            }
        )
    if simulados_no_mes == 0:
        insights.append(
            {
                "id": "sem-aplicacoes-mes",
                "tipo": "atividade",
                "titulo": "Sem aplicações no mês",
                "texto": "Não há simulados registrados neste mês. Verifique calendário, turmas e provas liberadas.",
                "criadoEm": agora,
            }
        )
    return insights


def _insights_professor(qualidade: dict, provas: list[Simulado]) -> list[dict]:
    agora = datetime.now(timezone.utc).isoformat()
    insights: list[dict] = []
    if qualidade["comAlertas"] > 0:
        insights.append(
            {
                "id": "professor-questoes-alerta",
                "tipo": "qualidade",
                "titulo": "Revisar minhas questões",
                "texto": (
                    f"{qualidade['comAlertas']} das suas questões têm alerta de qualidade. "
                    "Priorize gabarito, uso em prova, respostas em branco e taxa de acerto extrema."
                ),
                "criadoEm": agora,
            }
        )
    if qualidade["rascunhos"] > 0:
        insights.append(
            {
                "id": "professor-rascunhos",
                "tipo": "autoria",
                "titulo": "Rascunhos pendentes",
                "texto": (
                    f"Você tem {qualidade['rascunhos']} questão(ões) em rascunho. "
                    "Finalize a revisão para liberar uso em novas provas."
                ),
                "criadoEm": agora,
            }
        )
    em_curadoria = [
        prova for prova in provas if _status_simulado_front(prova.status) == "em_curadoria"
    ]
    if em_curadoria:
        insights.append(
            {
                "id": "professor-provas-curadoria",
                "tipo": "provas",
                "titulo": "Provas em curadoria",
                "texto": (
                    f"{len(em_curadoria)} prova(s) ainda aguardam validação/liberação. "
                    "Confira quantidade mínima, turma, tempo e questões antes de aplicar."
                ),
                "criadoEm": agora,
            }
        )
    if not insights:
        insights.append(
            {
                "id": "professor-sem-alertas",
                "tipo": "ok",
                "titulo": "Fluxo em dia",
                "texto": "Suas questões e provas não apresentam alertas prioritários no momento.",
                "criadoEm": agora,
            }
        )
    return insights


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
    qualidade_acervo = _qualidade_acervo_admin(sessao)

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
        "qualidadeAcervo": qualidade_acervo,
        "insights": _insights_admin(qualidade_acervo, alunos_em_risco, simulados_no_mes),
    }


# ---------------------------------------------------------------------------
# ALUNO (telas do próprio aluno — ownership pelo token)
# ---------------------------------------------------------------------------


@router.get("/professor/dashboard", dependencies=[Depends(montadores_prova)])
def dashboard_professor(
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    questoes = sessao.scalars(
        select(Questao)
        .where(Questao.criado_por_id == usuario.id)
        .order_by(Questao.criada_em.desc(), Questao.id.desc())
    ).all()
    provas = sessao.scalars(
        select(Simulado)
        .where(Simulado.gestor_id == usuario.id)
        .order_by(Simulado.criado_em.desc(), Simulado.id.desc())
    ).all()
    revisoes_pendentes = (
        sessao.scalar(
            select(func.count(RevisaoQuestao.id)).where(
                RevisaoQuestao.solicitante_id == usuario.id,
                RevisaoQuestao.status == "pendente",
            )
        )
        or 0
    )
    metricas = metricas_questoes_service.metricas_por_questoes(sessao, list(questoes))
    com_alertas = sum(1 for item in metricas.values() if item.get("alertas"))
    sem_respostas = sum(
        1 for item in metricas.values() if int(item.get("total_respostas") or 0) == 0
    )
    soma_taxa = sum(float(item.get("taxa_acerto") or 0) for item in metricas.values())
    por_status = {
        "publicada": 0,
        "rascunho": 0,
        "em_revisao": 0,
        "arquivada": 0,
    }
    for questao in questoes:
        chave = (
            questao.status.value
            if hasattr(questao.status, "value")
            else str(questao.status)
        )
        por_status[chave] = por_status.get(chave, 0) + 1

    qualidade = {
        "totalQuestoes": len(questoes),
        "publicadas": por_status.get("publicada", 0),
        "rascunhos": por_status.get("rascunho", 0),
        "emRevisao": por_status.get("em_revisao", 0),
        "arquivadas": por_status.get("arquivada", 0),
        "comAlertas": com_alertas,
        "semRespostas": sem_respostas,
        "taxaMediaAcerto": round(soma_taxa / len(questoes), 4) if questoes else 0.0,
    }

    provas_liberadas = [
        prova for prova in provas if _status_simulado_front(prova.status) == "liberado"
    ]
    return {
        "kpis": {
            "minhasQuestoes": len(questoes),
            "provasCriadas": len(provas),
            "provasLiberadas": len(provas_liberadas),
            "revisoesPendentes": int(revisoes_pendentes),
            "alertasQualidade": com_alertas,
        },
        "qualidadeQuestoes": qualidade,
        "provasRecentes": [
            {
                **_serializar_simulado(prova),
                "totalQuestoes": len(prova.questoes),
                "totalAlunos": len(prova.turma.alunos) if prova.turma else 0,
            }
            for prova in provas[:5]
        ],
        "questoesRecentes": [_serializar_questao(questao) for questao in questoes[:5]],
        "insights": _insights_professor(qualidade, list(provas)),
    }


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

    mostrar_resultado = bool(
        _config_resultados(sessao).get("mostrarResultadoImediato", True)
    )
    resultados = _resultados_do_aluno(sessao, aluno) if mostrar_resultado else []
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
    if not bool(_config_resultados(sessao).get("mostrarResultadoImediato", True)):
        return {"dados": []}
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
        _serializar_questao_para_aluno(sq.questao)
        for sq in sorted(s.questoes, key=lambda x: x.ordem_questao)
        if sq.questao
    ]
    tentativa = prova_avancada_service.tentativa_ativa(
        sessao, simulado_id=s.id, aluno_id=aluno.id,
    ) or prova_avancada_service.tentativa_mais_recente(
        sessao, simulado_id=s.id, aluno_id=aluno.id,
    )
    consulta_respostas = select(Resposta).where(
        Resposta.aluno_id == aluno.id,
        Resposta.simulado_id == s.id,
    )
    if tentativa is not None:
        consulta_respostas = consulta_respostas.where(Resposta.tentativa_id == tentativa.id)
    else:
        consulta_respostas = consulta_respostas.where(Resposta.tentativa_id.is_(None))
    respostas = sessao.scalars(consulta_respostas).all()
    return {
        "simulado": _serializar_simulado(s),
        "acessibilidade": _acessibilidade_aluno_simulado(sessao, aluno, s),
        "questoes": questoes,
        "respostas": [
            {
                "questaoId": str(r.questao_id),
                "alternativaId": str(r.alternativa_id) if r.alternativa_id else None,
                "status": r.status or ("respondida" if r.alternativa_id else "em_branco"),
                "tempoGastoSegundos": int(r.tempo_gasto_segundos or 0),
                "trocasDeResposta": int(r.trocas_de_resposta or 0),
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
    config_resultados = _config_resultados(sessao)
    mostrar_resultado = bool(config_resultados.get("mostrarResultadoImediato", True))
    mostrar_gabarito = bool(config_resultados.get("mostrarGabaritoAoAluno", True))
    if not mostrar_resultado:
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "RESULTADO_NAO_LIBERADO",
                "mensagem": "O resultado ainda nao foi liberado para o aluno.",
            },
        )
    resultado = _computar_resultado(sessao, aluno.id, s)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Resultado não disponível.")
    tentativas = []
    for r in sessao.scalars(
        select(ResultadoSimulado)
        .where(
            ResultadoSimulado.aluno_id == aluno.id,
            ResultadoSimulado.simulado_id == s.id,
        )
        .order_by(ResultadoSimulado.criado_em.desc(), ResultadoSimulado.id.desc())
    ).all():
        tentativa_serializada = _serializar_resultado_persistido(r)
        tentativas.append(
            tentativa_serializada
            if mostrar_gabarito
            else _resultado_sem_gabarito(tentativa_serializada)
        )
    if not mostrar_gabarito:
        resultado = _resultado_sem_gabarito(resultado)
    questoes = [
        _serializar_questao_para_aluno(sq.questao, incluir_gabarito=mostrar_gabarito)
        for sq in sorted(s.questoes, key=lambda x: x.ordem_questao)
        if sq.questao
    ]
    return {
        "simulado": _serializar_simulado(s),
        "resultado": resultado,
        "tentativas": tentativas,
        "questoes": questoes,
        "permissoes": {
            "mostrarResultado": mostrar_resultado,
            "mostrarGabarito": mostrar_gabarito,
        },
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


def _serializar_turma_resumo(turma: Turma, *, limite_alunos: int = 8) -> dict:
    simulados = list(turma.simulados or [])
    alunos = [a for a in (turma.alunos or []) if a.usuario]
    return {
        "id": str(turma.id),
        "nome": turma.nome or f"Turma {turma.id}",
        "escolaId": str(turma.escola_id),
        "serie": _SERIE_NOME_PARA_CODE.get(turma.serie.nome, "") if turma.serie else "",
        "turno": "matutino",
        "anoLetivo": turma.ano_letivo,
        "alunoIds": [str(a.id) for a in alunos],
        "alunos": [
            {
                "id": str(a.id),
                "usuarioId": str(a.usuario_id),
                "nome": a.usuario.nome,
                "email": a.usuario.email,
                "necessitaSuporte": bool(a.necessita_suporte),
            }
            for a in alunos[:limite_alunos]
        ],
        "ativa": True,
        "criadaEm": datetime.now(timezone.utc).isoformat(),
        "escolaNome": turma.escola.nome if turma.escola else "",
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
        dados.append(_serializar_turma_resumo(t))
    return {"dados": dados}


@router.get("/gestor/turmas/{turma_id}", dependencies=[Depends(montadores_prova)])
def gestor_turma_detalhe(
    turma_id: int,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    turma = _exigir_turma_permitida(sessao, usuario, turma_id)
    alunos = [a for a in (turma.alunos or []) if a.usuario]
    simulados = (
        sessao.scalars(
            select(Simulado)
            .where(Simulado.turma_id == turma.id)
            .order_by(Simulado.criado_em.desc())
        ).all()
    )

    alunos_detalhe = []
    resultados_recentes = []
    for aluno in sorted(alunos, key=lambda a: a.usuario.nome if a.usuario else ""):
        resultados = _resultados_do_aluno(sessao, aluno)
        media = round(sum(r["notaFinal"] for r in resultados) / len(resultados), 1) if resultados else None
        ultimo = resultados[0] if resultados else None
        if ultimo:
            resultados_recentes.append(
                {
                    "alunoId": str(aluno.id),
                    "alunoNome": aluno.usuario.nome,
                    "simuladoId": ultimo["simuladoId"],
                    "notaFinal": ultimo["notaFinal"],
                    "acertos": ultimo["acertos"],
                    "erros": ultimo["erros"],
                    "emBranco": ultimo["emBranco"],
                    "finalizadoEm": ultimo["finalizadoEm"],
                }
            )
        alunos_detalhe.append(
            {
                "id": str(aluno.id),
                "usuarioId": str(aluno.usuario_id),
                "nome": aluno.usuario.nome,
                "email": aluno.usuario.email,
                "fotoUrl": aluno.usuario.foto_url,
                "necessitaSuporte": bool(aluno.necessita_suporte),
                "adaptacoes": aluno.perfil_cognitivo or [],
                "media": media,
                "probabilidadeRisco": _prob_risco_media(aluno, media),
                "totalResultados": len(resultados),
                "ultimoResultado": ultimo,
                "competenciasFracas": _competencias_fracas_aluno(sessao, aluno),
            }
        )

    simulados_detalhe = []
    for sim in simulados:
        resultado_media = _media_simulado(sessao, sim)
        acompanhamento = acompanhar_simulado(sim.id, usuario, sessao)
        simulados_detalhe.append(
            {
                **_serializar_simulado(sim),
                "media": resultado_media,
                "totalQuestoes": len(sim.questoes),
                "totalAlunos": len(_alunos_do_simulado(sim)),
                "contagens": acompanhamento["contagens"],
            }
        )

    total_finalizados = sum(1 for s in simulados_detalhe if s["status"] == "finalizado")
    medias_alunos = [a["media"] for a in alunos_detalhe if a["media"] is not None]
    media_turma = round(sum(medias_alunos) / len(medias_alunos), 1) if medias_alunos else None
    alunos_risco = [
        a for a in alunos_detalhe
        if a["necessitaSuporte"] or a["probabilidadeRisco"] >= 0.5
    ]
    alertas = []
    if alunos_risco:
        alertas.append(
            {
                "tipo": "risco",
                "severidade": "alta" if any(a["probabilidadeRisco"] >= 0.7 for a in alunos_risco) else "media",
                "titulo": "Alunos precisam de acompanhamento",
                "mensagem": f"{len(alunos_risco)} aluno(s) com suporte/adaptacao ou risco pedagogico.",
                "quantidade": len(alunos_risco),
            }
        )
    pendentes = [
        s for s in simulados_detalhe
        if s["status"] in ("rascunho", "em_curadoria", "liberado", "em_andamento")
    ]
    if pendentes:
        alertas.append(
            {
                "tipo": "prova_pendente",
                "severidade": "media",
                "titulo": "Provas aguardam conclusao",
                "mensagem": f"{len(pendentes)} prova(s) ainda nao finalizadas.",
                "quantidade": len(pendentes),
            }
        )

    resultados_recentes.sort(key=lambda r: r["finalizadoEm"] or "", reverse=True)
    return {
        "turma": _serializar_turma_resumo(turma, limite_alunos=200),
        "kpis": {
            "totalAlunos": len(alunos),
            "totalComAdaptacao": sum(1 for a in alunos if a.necessita_suporte),
            "totalSimulados": len(simulados),
            "simuladosFinalizados": total_finalizados,
            "mediaTurma": media_turma,
            "alunosEmRisco": len(alunos_risco),
        },
        "alunos": alunos_detalhe,
        "simulados": simulados_detalhe,
        "resultadosRecentes": resultados_recentes[:12],
        "alertas": alertas,
    }


@router.get(
    "/gestor/turmas/{turma_id}/relatorio/exportar",
    dependencies=[Depends(montadores_prova)],
)
def exportar_relatorio_turma(
    turma_id: int,
    formato: str = Query("csv", pattern="^(csv|json)$"),
    secao: str = Query("alunos", pattern="^(alunos|simulados|resultados)$"),
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> object:
    relatorio = gestor_turma_detalhe(turma_id, usuario, sessao)
    if formato == "json":
        return relatorio

    turma = relatorio["turma"]
    turma_nome = turma.get("nome") or f"Turma {turma_id}"
    nome_base = f"relatorio-turma-{turma_id}"

    if secao == "simulados":
        linhas = [
            {
                "turma_id": turma["id"],
                "turma_nome": turma_nome,
                "simulado_id": item.get("id"),
                "simulado_nome": item.get("nome") or item.get("parametros", {}).get("nome"),
                "status": item.get("status"),
                "media": item.get("media"),
                "total_questoes": item.get("totalQuestoes"),
                "total_alunos": item.get("totalAlunos"),
            }
            for item in relatorio["simulados"]
        ]
        return _csv_response(
            f"{nome_base}-simulados.csv",
            linhas,
            [
                "turma_id",
                "turma_nome",
                "simulado_id",
                "simulado_nome",
                "status",
                "media",
                "total_questoes",
                "total_alunos",
            ],
        )

    if secao == "resultados":
        linhas = [
            {
                "turma_id": turma["id"],
                "turma_nome": turma_nome,
                "aluno_id": item.get("alunoId"),
                "aluno_nome": item.get("alunoNome"),
                "simulado_id": item.get("simuladoId"),
                "nota_final": item.get("notaFinal"),
                "acertos": item.get("acertos"),
                "erros": item.get("erros"),
                "em_branco": item.get("emBranco"),
                "finalizado_em": item.get("finalizadoEm"),
            }
            for item in relatorio["resultadosRecentes"]
        ]
        return _csv_response(
            f"{nome_base}-resultados.csv",
            linhas,
            [
                "turma_id",
                "turma_nome",
                "aluno_id",
                "aluno_nome",
                "simulado_id",
                "nota_final",
                "acertos",
                "erros",
                "em_branco",
                "finalizado_em",
            ],
        )

    linhas = [
        {
            "turma_id": turma["id"],
            "turma_nome": turma_nome,
            "aluno_id": item.get("id"),
            "usuario_id": item.get("usuarioId"),
            "nome": item.get("nome"),
            "email": item.get("email"),
            "necessita_suporte": item.get("necessitaSuporte"),
            "media": item.get("media"),
            "probabilidade_risco": item.get("probabilidadeRisco"),
            "total_resultados": item.get("totalResultados"),
            "adaptacoes": "; ".join(item.get("adaptacoes") or []),
            "competencias_fracas": "; ".join(item.get("competenciasFracas") or []),
        }
        for item in relatorio["alunos"]
    ]
    return _csv_response(
        f"{nome_base}-alunos.csv",
        linhas,
        [
            "turma_id",
            "turma_nome",
            "aluno_id",
            "usuario_id",
            "nome",
            "email",
            "necessita_suporte",
            "media",
            "probabilidade_risco",
            "total_resultados",
            "adaptacoes",
            "competencias_fracas",
        ],
    )


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
    parametros = _aplicar_defaults_parametros_prova(sessao, parametros)
    _validar_parametros_quantidade_prova(sessao, parametros)
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


def _selecionar_questoes_por_parametros(
    sessao: Session,
    *,
    usuario: Usuario,
    parametros: dict,
    respeitar_minimo: bool = True,
) -> tuple[list[Questao], list[str]]:
    minimo, maximo = _limites_prova(sessao)
    quantidade = _inteiro_positivo(
        parametros.get("quantidadeQuestoes", parametros.get("quantidade")),
        10,
    )
    quantidade = min(quantidade, maximo)
    quantidade = max(minimo if respeitar_minimo else 1, quantidade)
    avisos: list[str] = []
    q = (
        sessao.query(Questao)
        .join(Serie, Questao.serie_id == Serie.id)
        .join(Materia, Questao.materia_id == Materia.id)
        .join(Nivel, Questao.nivel_id == Nivel.id)
        .filter(Questao.status == StatusQuestao.PUBLICADA)
    )
    serie_nome = labels.serie_nome(parametros.get("serie"))
    if serie_nome:
        q = q.filter(Serie.nome == serie_nome)
    materias = [
        labels.materia_nome(m)
        for m in _lista_unica(parametros.get("materias") or parametros.get("materia"))
    ]
    materias = [m for m in materias if m]
    if materias:
        q = q.filter(Materia.nome.in_(materias))
    conteudos = [
        str(c).strip()
        for c in _lista_unica(parametros.get("conteudos"))
        if str(c).strip()
    ]
    if conteudos:
        q = q.filter(Questao.conteudo.has(Conteudo.nome.in_(conteudos)))
    niveis = [
        labels.MAP_NIVEL.get(n, n)
        for n in _lista_unica(parametros.get("niveis") or parametros.get("nivel"))
    ]
    niveis = [n for n in niveis if n]
    if niveis:
        q = q.filter(Nivel.nome.in_(niveis))
    if "comImagem" in parametros:
        if parametros.get("comImagem") is True:
            q = q.filter(Questao.imagem_url.is_not(None), Questao.imagem_url != "")
        elif parametros.get("comImagem") is False:
            q = q.filter((Questao.imagem_url.is_(None)) | (Questao.imagem_url == ""))
    q = aplicar_escopo_questoes(q, usuario)
    ids_excluidos = _ids_questoes_excluidas(parametros)
    if ids_excluidos:
        q = q.filter(~Questao.id.in_(ids_excluidos))
    candidatas = _embaralhar_questoes(q.all(), parametros)

    if parametros.get("evitarQuestoesJaUsadas"):
        usadas = set(sessao.scalars(select(SimuladoQuestao.questao_id)).all())
        filtradas = [questao for questao in candidatas if questao.id not in usadas]
        if len(filtradas) < quantidade:
            avisos.append(
                "O banco nao tem questoes ineditas suficientes; algumas usadas recentemente podem entrar."
            )
        candidatas = filtradas or candidatas

    distribuicao = parametros.get("distribuicao") or {}
    por_nivel: dict[str, list[Questao]] = {"facil": [], "medio": [], "dificil": []}
    for questao in candidatas:
        code = labels.nivel_code(questao.nivel.nome if questao.nivel else "")
        if code in por_nivel:
            por_nivel[code].append(questao)

    selecionadas: list[Questao] = []
    if isinstance(distribuicao, dict) and any(distribuicao.values()):
        metas = {
            nivel: round((float(distribuicao.get(nivel, 0) or 0) / 100) * quantidade)
            for nivel in por_nivel
        }
        for nivel, meta in metas.items():
            selecionadas.extend(por_nivel[nivel][:meta])
    faltam = quantidade - len(selecionadas)
    if faltam > 0:
        escolhidas = {questao.id for questao in selecionadas}
        selecionadas.extend(
            [questao for questao in candidatas if questao.id not in escolhidas][:faltam]
        )
    if len(selecionadas) < quantidade:
        avisos.append(
            f"Banco retornou {len(selecionadas)} de {quantidade} questoes solicitadas."
        )
    if ids_excluidos and not selecionadas:
        avisos.append("Todas as questoes compatíveis com os filtros ja estavam na prova.")
    return selecionadas[:quantidade], avisos


def _persistir_questoes_simulado(
    sessao: Session, simulado: Simulado, questoes: list[Questao],
) -> None:
    sessao.query(SimuladoQuestao).filter(SimuladoQuestao.simulado_id == simulado.id).delete()
    for ordem, questao in enumerate(questoes, start=1):
        sessao.add(
            SimuladoQuestao(
                simulado_id=simulado.id,
                questao_id=questao.id,
                ordem_questao=ordem,
                alternativas_ordem=[alt.id for alt in questao.alternativas],
            )
        )
    simulado.status = StatusSimulado.GERADO


@router.post(
    "/gestor/simulados/gerar-automaticamente",
    status_code=201,
    dependencies=[Depends(montadores_prova)],
)
def gerar_simulado_automaticamente(
    parametros: dict,
    request: Request,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    parametros = _aplicar_defaults_parametros_prova(sessao, parametros)
    _validar_parametros_quantidade_prova(sessao, parametros)
    turma_id_raw = parametros.get("turmaId")
    try:
        turma_id = int(turma_id_raw) if turma_id_raw is not None else None
    except (TypeError, ValueError):
        turma_id = None
    _exigir_turma_permitida(sessao, usuario, turma_id)
    questoes, avisos = _selecionar_questoes_por_parametros(
        sessao, usuario=usuario, parametros=parametros,
    )
    quantidade_solicitada = _inteiro_positivo(
        parametros.get("quantidadeQuestoes", parametros.get("quantidade")),
        10,
    )
    minimo, maximo = _limites_prova(sessao)
    quantidade_solicitada = max(minimo, min(quantidade_solicitada, maximo))
    if not questoes:
        raise HTTPException(
            status_code=422,
            detail="Nenhuma questao publicada encontrada para os filtros informados.",
        )
    if len(questoes) < quantidade_solicitada:
        raise HTTPException(
            status_code=422,
            detail={
                "codigo": "BANCO_INSUFICIENTE",
                "mensagem": (
                    f"O banco retornou {len(questoes)} de "
                    f"{quantidade_solicitada} questoes solicitadas."
                ),
                "totalAtual": len(questoes),
                "minimo": quantidade_solicitada,
            },
        )
    sim = Simulado(
        gestor_id=usuario.id,
        turma_id=turma_id,
        titulo=parametros.get("nome") or parametros.get("titulo") or "Prova automatica",
        parametros_json=parametros,
        status=StatusSimulado.RASCUNHO,
        criado_em=datetime.now(timezone.utc),
    )
    sessao.add(sim)
    sessao.flush()
    _persistir_questoes_simulado(sessao, sim, questoes)
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="gerar_prova_automatica",
        alvo_tipo="simulado",
        alvo_id=sim.id,
        detalhes=f"Gerou prova automatica com {len(questoes)} questoes.",
        request=request,
    )
    sessao.commit()
    sessao.refresh(sim)
    return {
        "simulado": _serializar_simulado(sim),
        "questoesSelecionadas": [_serializar_questao(q) for q in questoes],
        "questaoIds": [str(q.id) for q in questoes],
        "avisos": avisos,
    }


@router.post("/gestor/questoes/sugerir", dependencies=[Depends(montadores_prova)])
def sugerir_questoes_prova(
    parametros: dict,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    parametros = _aplicar_defaults_parametros_prova(sessao, parametros)
    questoes, avisos = _selecionar_questoes_por_parametros(
        sessao,
        usuario=usuario,
        parametros=parametros,
        respeitar_minimo=False,
    )
    if not questoes:
        raise HTTPException(
            status_code=422,
            detail="Nenhuma questao publicada encontrada para os filtros informados.",
        )
    return {
        "questoesSelecionadas": [_serializar_questao(q) for q in questoes],
        "questaoIds": [str(q.id) for q in questoes],
        "avisos": avisos,
    }


@router.get("/gestor/prova-templates", dependencies=[Depends(montadores_prova)])
def listar_templates_prova(
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    q = (
        select(ProvaTemplate)
        .where(ProvaTemplate.ativo.is_(True))
        .order_by(ProvaTemplate.criado_em.desc())
    )
    if usuario.perfil != PerfilUsuario.ADMIN:
        q = q.where(
            (ProvaTemplate.escola_id == usuario.escola_id) | (ProvaTemplate.escola_id.is_(None))
        )
    dados = sessao.scalars(q).all()
    return {
        "dados": [
            {
                "id": str(t.id),
                "nome": t.nome,
                "descricao": t.descricao,
                "escolaId": str(t.escola_id) if t.escola_id else None,
                "parametros": t.parametros_json,
                "criadoPor": str(t.criado_por_id),
                "criadoEm": t.criado_em.isoformat() if t.criado_em else None,
            }
            for t in dados
        ]
    }


@router.post(
    "/gestor/prova-templates",
    status_code=201,
    dependencies=[Depends(montadores_prova)],
)
def criar_template_prova(
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    nome = str(corpo.get("nome") or "").strip()
    if len(nome) < 3:
        raise HTTPException(status_code=422, detail="Nome do template e obrigatorio.")
    parametros = corpo.get("parametros") if isinstance(corpo.get("parametros"), dict) else {}
    escola_id = usuario.escola_id if usuario.perfil != PerfilUsuario.ADMIN else corpo.get("escolaId")
    template = ProvaTemplate(
        nome=nome,
        descricao=corpo.get("descricao"),
        escola_id=escola_id,
        criado_por_id=usuario.id,
        parametros_json=parametros,
    )
    sessao.add(template)
    sessao.flush()
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="criar_template_prova",
        alvo_tipo="prova_template",
        alvo_id=template.id,
        detalhes=f"Criou template de prova {template.nome}.",
        request=request,
    )
    sessao.commit()
    return {"id": str(template.id), "nome": template.nome, "parametros": template.parametros_json}


@router.post(
    "/gestor/prova-templates/{template_id}/gerar",
    status_code=201,
    dependencies=[Depends(montadores_prova)],
)
def gerar_prova_por_template(
    template_id: int,
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    template = sessao.get(ProvaTemplate, template_id)
    if template is None or not template.ativo:
        raise HTTPException(status_code=404, detail="Template nao encontrado.")
    if usuario.perfil != PerfilUsuario.ADMIN and template.escola_id not in (None, usuario.escola_id):
        raise HTTPException(status_code=403, detail="Template fora do seu escopo.")
    parametros = {**(template.parametros_json or {}), **(corpo or {})}
    return gerar_simulado_automaticamente(parametros, request, usuario, sessao)


def _usuario_aluno_card(u: Usuario, aluno: Aluno) -> dict:
    card = _usuario_card(u)
    card["adaptacoes"] = aluno.perfil_cognitivo or []
    card["turmaIds"] = [str(aluno.turma_id)] if aluno.turma_id else []
    card["escolaId"] = (
        str(aluno.turma.escola_id) if aluno.turma and aluno.turma.escola_id else None
    )
    return card


def _resultados_do_aluno(sessao: Session, aluno: Aluno) -> list[dict]:
    persistidos = [
        _serializar_resultado_persistido(r)
        for r in sessao.scalars(
            select(ResultadoSimulado)
            .where(ResultadoSimulado.aluno_id == aluno.id)
            .order_by(ResultadoSimulado.criado_em.desc(), ResultadoSimulado.id.desc())
        ).all()
    ]
    tentativas_persistidas = {
        str(r["tentativaId"]) for r in persistidos if r.get("tentativaId")
    }

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
    out = list(persistidos)
    for sid in sim_ids:
        s = sessao.get(Simulado, sid)
        if s:
            r = _computar_resultado(sessao, aluno.id, s, incluir_sem_respostas=True)
            tentativa_id = str(r.get("tentativaId")) if r and r.get("tentativaId") else None
            if r and (tentativa_id is None or tentativa_id not in tentativas_persistidas):
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


@router.post(
    "/gestor/simulados/{simulado_id}/duplicar",
    status_code=201,
    dependencies=[Depends(montadores_prova)],
)
def duplicar_simulado(
    simulado_id: int,
    request: Request,
    corpo: dict | None = None,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    origem = sessao.get(Simulado, simulado_id)
    if origem is None:
        raise HTTPException(status_code=404, detail="Simulado nao encontrado.")
    _exigir_acesso_simulado(sessao, usuario, origem)
    _exigir_turma_permitida(sessao, usuario, origem.turma_id)

    parametros = dict(origem.parametros_json or {})
    titulo_origem = parametros.get("nome") or origem.titulo
    novo_titulo = (
        (corpo or {}).get("nome")
        or (corpo or {}).get("titulo")
        or f"Copia de {titulo_origem}"
    )
    parametros.update(
        {
            "nome": novo_titulo,
            "duplicadaDe": str(origem.id),
            "duplicadaEm": datetime.now(timezone.utc).isoformat(),
        }
    )
    _validar_parametros_quantidade_prova(sessao, parametros)

    novo = Simulado(
        gestor_id=usuario.id,
        turma_id=origem.turma_id,
        titulo=novo_titulo,
        parametros_json=parametros,
        status=StatusSimulado.RASCUNHO,
        criado_em=datetime.now(timezone.utc),
    )
    sessao.add(novo)
    sessao.flush()
    for sq in sorted(origem.questoes, key=lambda item: item.ordem_questao):
        sessao.add(
            SimuladoQuestao(
                simulado_id=novo.id,
                questao_id=sq.questao_id,
                ordem_questao=sq.ordem_questao,
                alternativas_ordem=sq.alternativas_ordem,
            )
        )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="duplicar_simulado",
        alvo_tipo="simulado",
        alvo_id=novo.id,
        detalhes=f"Duplicou simulado #{origem.id} para {novo.titulo}.",
        request=request,
    )
    sessao.commit()
    sessao.refresh(novo)
    return {"simulado": _serializar_simulado(novo), "origemId": str(origem.id)}


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
    _validar_parametros_quantidade_prova(sessao, novos_parametros)
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
        _validar_parametros_quantidade_prova(sessao, {**(sim.parametros_json or {}), **p})
        sim.turma_id = turma_id
        sim.parametros_json = {**(sim.parametros_json or {}), **p}
        sim.titulo = sim.parametros_json.get("nome") or sim.titulo
    minimo, maximo = _limites_prova(sessao)
    total = _inteiro_positivo(p.get("quantidadeQuestoes", 10), 10)
    total = max(minimo, min(total, maximo))
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
    ids_excluidos = _ids_questoes_excluidas(p)
    if ids_excluidos:
        q = q.filter(~Questao.id.in_(ids_excluidos))
    candidatas = _embaralhar_questoes(q.all(), p)

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

    if len(selecionadas) < total:
        raise HTTPException(
            status_code=422,
            detail={
                "codigo": "BANCO_INSUFICIENTE",
                "mensagem": (
                    f"O banco retornou {len(selecionadas)} de "
                    f"{total} questoes solicitadas."
                ),
                "totalAtual": len(selecionadas),
                "minimo": total,
            },
        )

    # persiste as questões do simulado
    sessao.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == sim.id
    ).delete()
    for ordem, qq in enumerate(selecionadas, start=1):
        sessao.add(
            SimuladoQuestao(
                simulado_id=sim.id,
                questao_id=qq.id,
                ordem_questao=ordem,
                alternativas_ordem=[alt.id for alt in qq.alternativas],
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
    questoes_por_id: dict[int, Questao] = {}
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
            questoes_por_id[qid] = questao
            vistos.add(qid)
    if not questoes_ok:
        raise HTTPException(
            status_code=422, detail="Informe ao menos uma questão válida (questaoIds)."
        )
    _validar_parametros_quantidade_prova(
        sessao, {"quantidadeQuestoes": len(questoes_ok)}
    )

    sessao.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == sim.id
    ).delete()
    for ordem, qid in enumerate(questoes_ok, start=1):
        questao = questoes_por_id[qid]
        sessao.add(
            SimuladoQuestao(
                simulado_id=sim.id,
                questao_id=qid,
                ordem_questao=ordem,
                alternativas_ordem=[alt.id for alt in questao.alternativas],
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


@router.get(
    "/gestor/simulados/{simulado_id}/validar", dependencies=[Depends(montadores_prova)]
)
def validar_prova(
    simulado_id: int,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado nao encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    return {
        "simuladoId": str(sim.id),
        "status": _status_simulado_front(sim.status),
        **_validar_simulado_com_config(sessao, sim),
    }


@router.get(
    "/gestor/simulados/{simulado_id}/preview", dependencies=[Depends(montadores_prova)]
)
def preview_prova(
    simulado_id: int,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado nao encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    snapshot = prova_avancada_service.snapshot_mais_recente(sessao, sim.id)
    questoes_snapshot = (
        snapshot.questoes_json if snapshot else prova_avancada_service.montar_questoes_snapshot(sim)
    )
    return {
        "simulado": _serializar_simulado(sim),
        "snapshot": (
            {
                "id": str(snapshot.id),
                "versao": snapshot.versao,
                "criadoEm": snapshot.criado_em.isoformat() if snapshot.criado_em else None,
            }
            if snapshot
            else None
        ),
        "questoes": questoes_snapshot,
        "validacao": _validar_simulado_com_config(sessao, sim),
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
    validacao = _validar_simulado_com_config(sessao, sim)
    if not validacao["ok"]:
        raise HTTPException(status_code=422, detail=validacao)
    snapshot = prova_avancada_service.criar_ou_obter_snapshot(
        sessao, simulado=sim, usuario=usuario,
    )
    sim.status = StatusSimulado.LIBERADO
    alunos = _alunos_do_simulado(sim)
    notificados = prova_avancada_service.notificar(
        sessao,
        destinatarios=[a.usuario for a in alunos if a.usuario],
        tipo="prova_liberada",
        titulo="Prova liberada",
        mensagem=f"A prova {sim.titulo} esta disponivel para resposta.",
        origem_id=str(sim.id),
        origem_tipo="simulado",
        acao_url=f"/aluno/simulado/{sim.id}/instrucoes",
        acao_label="Iniciar prova",
    )
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
        "snapshotId": str(snapshot.id),
        "validacao": validacao,
        "notificados": notificados,
    }


def _aluno_no_escopo_da_prova(usuario: Usuario, simulado: Simulado, aluno: Aluno) -> bool:
    if usuario.perfil == PerfilUsuario.ADMIN:
        return True
    escola_simulado = simulado.turma.escola_id if simulado.turma else None
    escola_aluno = aluno.turma.escola_id if aluno.turma else None
    return escola_simulado is not None and escola_simulado == escola_aluno == usuario.escola_id


@router.post(
    "/gestor/simulados/{simulado_id}/inscricoes/lote",
    status_code=201,
    dependencies=[Depends(montadores_prova)],
)
def inscrever_alunos_lote(
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
    aluno_ids = []
    for raw in corpo.get("alunoIds") or corpo.get("aluno_ids") or []:
        try:
            aluno_ids.append(int(raw))
        except (TypeError, ValueError):
            continue
    if not aluno_ids:
        raise HTTPException(status_code=422, detail="Informe alunoIds.")

    inscritos = []
    rejeitados = []
    for aluno_id in dict.fromkeys(aluno_ids):
        aluno = sessao.get(Aluno, aluno_id)
        if aluno is None:
            rejeitados.append({"alunoId": aluno_id, "motivo": "Aluno nao encontrado."})
            continue
        if not _aluno_no_escopo_da_prova(usuario, sim, aluno):
            rejeitados.append({"alunoId": aluno_id, "motivo": "Aluno fora do escopo da prova."})
            continue
        inscricao = _inscricao_simulado_aluno(sessao, aluno.id, sim.id)
        if inscricao is None:
            inscricao = SimuladoInscricao(
                simulado_id=sim.id,
                aluno_id=aluno.id,
                inscrito_por_id=usuario.id,
                status="inscrito",
            )
            sessao.add(inscricao)
        else:
            inscricao.status = "inscrito"
            inscricao.inscrito_por_id = usuario.id
            inscricao.inscrito_em = datetime.now(timezone.utc)
        inscritos.append(aluno)

    prova_avancada_service.notificar(
        sessao,
        destinatarios=[a.usuario for a in inscritos if a.usuario],
        tipo="inscricao_prova",
        titulo="Voce foi inscrito em uma prova",
        mensagem=f"Voce foi inscrito na prova {sim.titulo}.",
        origem_id=str(sim.id),
        origem_tipo="simulado",
        acao_url=f"/aluno/simulado/{sim.id}/instrucoes",
        acao_label="Ver prova",
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="inscrever_alunos_lote",
        alvo_tipo="simulado",
        alvo_id=sim.id,
        detalhes=f"Inscreveu {len(inscritos)} alunos no simulado {sim.titulo}.",
        request=request,
    )
    sessao.commit()
    return {
        "simuladoId": str(sim.id),
        "inscritos": [{"alunoId": str(a.id), "nome": a.usuario.nome if a.usuario else ""} for a in inscritos],
        "rejeitados": rejeitados,
        "totalInscritos": len(inscritos),
    }


@router.post(
    "/gestor/simulados/{simulado_id}/inscricoes/turma",
    status_code=201,
    dependencies=[Depends(montadores_prova)],
)
def inscrever_turma_inteira(
    simulado_id: int,
    request: Request,
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado nao encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    aluno_ids = [a.id for a in (sim.turma.alunos if sim.turma else [])]
    return inscrever_alunos_lote(
        simulado_id,
        {"alunoIds": aluno_ids},
        request,
        usuario,
        sessao,
    )


@router.post(
    "/gestor/simulados/{simulado_id}/alunos/{aluno_id}/reabrir",
    dependencies=[Depends(admin_gestor_suporte)],
)
def reabrir_tentativa_aluno(
    simulado_id: int,
    aluno_id: int,
    corpo: dict,
    request: Request,
    usuario: Usuario = Depends(admin_gestor_suporte),
    sessao: Session = Depends(get_session),
) -> dict:
    sim = sessao.get(Simulado, simulado_id)
    aluno = sessao.get(Aluno, aluno_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado nao encontrado.")
    if aluno is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado.")
    _exigir_acesso_simulado(sessao, usuario, sim)
    if not _aluno_no_escopo_da_prova(usuario, sim, aluno):
        raise HTTPException(status_code=403, detail="Aluno fora do escopo da prova.")
    config_provas = _config_provas(sessao)
    if config_provas.get("permitirReabrirAposFinalizacao") is False:
        raise HTTPException(status_code=403, detail="Reabertura de tentativa desativada.")
    motivo = str(corpo.get("motivo") or "").strip()
    minimo_motivo = _inteiro_positivo(
        config_provas.get("motivoReaberturaMinCaracteres"), 5,
    )
    if len(motivo) < minimo_motivo:
        raise HTTPException(
            status_code=422,
            detail=f"Motivo da reabertura e obrigatorio (minimo {minimo_motivo} caracteres).",
        )
    tentativa = prova_avancada_service.reabrir_para_aluno(
        sessao, simulado=sim, aluno=aluno, usuario=usuario, motivo=motivo,
    )
    prova_avancada_service.notificar(
        sessao,
        destinatarios=[aluno.usuario] if aluno.usuario else [],
        tipo="tentativa_reaberta",
        titulo="Tentativa reaberta",
        mensagem=f"Sua tentativa da prova {sim.titulo} foi reaberta.",
        origem_id=str(sim.id),
        origem_tipo="simulado",
        acao_url=f"/aluno/simulado/{sim.id}/instrucoes",
        acao_label="Responder novamente",
    )
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="reabrir_tentativa",
        alvo_tipo="simulado",
        alvo_id=sim.id,
        detalhes=f"Reabriu tentativa do aluno #{aluno.id}. Motivo: {motivo}",
        request=request,
    )
    sessao.commit()
    return {
        "ok": True,
        "simuladoId": str(sim.id),
        "alunoId": str(aluno.id),
        "tentativaId": str(tentativa.id),
        "numero": tentativa.numero,
        "status": tentativa.status,
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
        if r.status == "respondida" and r.alternativa_id is not None:
            por_aluno[r.aluno_id] = por_aluno.get(r.aluno_id, 0) + 1
    tentativas = sessao.scalars(
        select(SimuladoTentativa).where(SimuladoTentativa.simulado_id == sim.id)
    ).all()
    tentativas_por_aluno = {t.aluno_id: t for t in sorted(tentativas, key=lambda x: x.numero)}

    agora = datetime.now(timezone.utc).isoformat()
    alunos = []
    for a in _alunos_do_simulado(sim):
        respondidas = por_aluno.get(a.id, 0)
        tentativa = tentativas_por_aluno.get(a.id)
        if tentativa and tentativa.status == "finalizada":
            status = "finalizado"
        elif tentativa and tentativa.status == "em_andamento":
            status = "em_andamento"
        elif respondidas == 0:
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
                "ultimaAtividadeEm": (
                    tentativa.ultima_atividade_em.isoformat()
                    if tentativa and tentativa.ultima_atividade_em
                    else agora
                ),
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


def _csv_response(nome_arquivo: str, linhas: list[dict], campos: list[str]) -> Response:
    saida = StringIO()
    saida.write("\ufeff")
    escritor = csv.DictWriter(saida, fieldnames=campos, extrasaction="ignore")
    escritor.writeheader()
    for linha in linhas:
        escritor.writerow(linha)
    return Response(
        content=saida.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )


@router.get(
    "/gestor/simulados/{simulado_id}/relatorio/exportar",
    dependencies=[Depends(montadores_prova)],
)
def exportar_relatorio_simulado(
    simulado_id: int,
    formato: str = Query("csv", pattern="^(csv|json)$"),
    secao: str = Query("tabela", pattern="^(tabela|competencias)$"),
    usuario: Usuario = Depends(montadores_prova),
    sessao: Session = Depends(get_session),
) -> object:
    relatorio = relatorio_simulado(simulado_id, usuario, sessao)
    if formato == "json":
        return relatorio

    simulado = relatorio["simulado"]
    nome_base = f"relatorio-simulado-{simulado_id}"
    nome_simulado = simulado["parametros"].get("nome") or simulado["nome"]
    if secao == "competencias":
        linhas = [
            {
                "simulado_id": simulado["id"],
                "simulado_nome": nome_simulado,
                "competencia": item.get("competencia"),
                "taxa_acerto": item.get("taxaAcerto"),
                "acertos": item.get("acertos"),
                "erros": item.get("erros"),
                "total": item.get("total"),
            }
            for item in relatorio["competencias"]
        ]
        return _csv_response(
            f"{nome_base}-competencias.csv",
            linhas,
            [
                "simulado_id",
                "simulado_nome",
                "competencia",
                "taxa_acerto",
                "acertos",
                "erros",
                "total",
            ],
        )

    linhas = [
        {
            "simulado_id": simulado["id"],
            "simulado_nome": nome_simulado,
            "aluno_id": item.get("alunoId"),
            "aluno_nome": item.get("alunoNome"),
            "nota_final": item.get("notaFinal"),
            "acertos": item.get("acertos"),
            "erros": item.get("erros"),
            "em_branco": item.get("emBranco"),
            "tempo_total_segundos": item.get("tempoTotalSegundos"),
            "em_risco": item.get("emRisco"),
            "adaptacoes": "; ".join(item.get("adaptacoes") or []),
        }
        for item in relatorio["tabela"]
    ]
    return _csv_response(
        f"{nome_base}-alunos.csv",
        linhas,
        [
            "simulado_id",
            "simulado_nome",
            "aluno_id",
            "aluno_nome",
            "nota_final",
            "acertos",
            "erros",
            "em_branco",
            "tempo_total_segundos",
            "em_risco",
            "adaptacoes",
        ],
    )


def _validar_item_importacao_questao(q: dict, sessao: Session) -> None:
    if not isinstance(q, dict):
        raise ValueError("item não é um objeto JSON")
    enunciado = (q.get("enunciado") or "").strip()
    if not enunciado:
        raise ValueError("enunciado é obrigatório")
    serie = labels.serie_nome(q.get("serie")) or ""
    if not serie or sessao.scalar(select(Serie).where(Serie.nome == serie)) is None:
        raise ValueError(f"série inexistente: '{q.get('serie')}'")
    nivel = labels.MAP_NIVEL.get(q.get("nivel"), q.get("nivel", ""))
    if not nivel or sessao.scalar(select(Nivel).where(Nivel.nome == nivel)) is None:
        raise ValueError(f"nível inexistente: '{q.get('nivel')}'")
    materia = labels.materia_nome(q.get("materia", ""))
    if not materia:
        raise ValueError("matéria é obrigatória")
    if not (q.get("conteudo") or "").strip():
        raise ValueError("conteúdo é obrigatório")
    alternativas = q.get("alternativas") or []
    if not isinstance(alternativas, list) or len(alternativas) < 2:
        raise ValueError("informe ao menos 2 alternativas")
    corretas = [a for a in alternativas if a.get("correta")]
    if len(corretas) != 1:
        raise ValueError("marque exatamente 1 alternativa como correta")
    for indice, alt in enumerate(alternativas, start=1):
        if not (alt.get("texto") or "").strip():
            raise ValueError(f"alternativa {indice} está sem texto")


@router.post("/admin/questoes/importar/validar", dependencies=[Depends(so_admin)])
def validar_importacao_questoes(
    corpo: dict,
    _usuario: Usuario = Depends(so_admin),
    sessao: Session = Depends(get_session),
) -> dict:
    questoes = corpo.get("questoes") or []
    rejeitadas = []
    for i, q in enumerate(questoes, start=1):
        try:
            _validar_item_importacao_questao(q, sessao)
        except ValueError as exc:
            rejeitadas.append(
                {
                    "linha": i,
                    "campo": "questao",
                    "motivo": str(exc),
                    "valor": (q.get("enunciado") or "")[:80] if isinstance(q, dict) else q,
                }
            )
    total = int(corpo.get("totalLinhas") or len(questoes))
    return {
        "valido": len(rejeitadas) == 0,
        "totalLinhas": total,
        "validas": max(0, len(questoes) - len(rejeitadas)),
        "rejeitadas": rejeitadas,
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
    request: Request,
    usuario: Usuario = Depends(autenticado),
    sessao: Session = Depends(get_session),
) -> dict:
    aluno = _aluno_do_usuario(usuario)
    sim = sessao.get(Simulado, simulado_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")
    _exigir_acesso_aluno_simulado_v2(sessao, aluno, sim)
    try:
        tentativa = prova_avancada_service.obter_ou_criar_tentativa(
            sessao, simulado=sim, aluno=aluno,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    prova_avancada_service.marcar_tentativa_iniciada(tentativa)
    inscricao = _inscricao_simulado_aluno(sessao, aluno.id, sim.id)
    if inscricao is not None and inscricao.status != "finalizado":
        inscricao.status = "em_andamento"
    auditoria_service.registrar(
        sessao,
        usuario=usuario,
        tipo="iniciar_simulado",
        alvo_tipo="simulado",
        alvo_id=sim.id,
        detalhes=f"Aluno #{aluno.id} iniciou tentativa #{tentativa.numero} do simulado {sim.titulo}.",
        request=request,
    )
    sessao.commit()
    acessibilidade = _acessibilidade_aluno_simulado(sessao, aluno, sim)
    tempo = int(acessibilidade["tempoTotalSegundos"])
    agora = datetime.now(timezone.utc).isoformat()
    return {
        "simuladoId": str(sim.id),
        "alunoId": str(aluno.id),
        "tentativaId": str(tentativa.id),
        "questaoAtualIndice": 0,
        "iniciadoEm": agora,
        "ultimaAtividadeEm": agora,
        "tempoRestanteSegundos": tempo,
        "status": "em_andamento",
        "conexaoOk": True,
        "acessibilidade": acessibilidade,
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
    tempo_gasto = _normalizar_tempo_gasto(corpo.get("tempoGastoSegundos"))
    try:
        tentativa = prova_avancada_service.obter_ou_criar_tentativa(
            sessao, simulado=sim, aluno=aluno,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    prova_avancada_service.marcar_tentativa_iniciada(tentativa)
    resposta = _salvar_resposta_aluno(
        sessao,
        aluno=aluno,
        simulado=sim,
        tentativa=tentativa,
        questao_id=questao_id,
        alternativa_raw=alt_raw,
        tempo_gasto=tempo_gasto,
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
        "alternativaId": str(resposta.alternativa_id) if resposta.alternativa_id else None,
        "status": resposta.status,
        "tempoGastoSegundos": tempo_gasto,
        "trocasDeResposta": int(resposta.trocas_de_resposta or 0),
        "respondidaEm": resposta.respondida_em.isoformat() if resposta.respondida_em else None,
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
    try:
        tentativa = prova_avancada_service.obter_ou_criar_tentativa(
            sessao, simulado=sim, aluno=aluno,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    prova_avancada_service.marcar_tentativa_iniciada(tentativa)
    respostas_payload = {
        str(item.get("questaoId")): item
        for item in ((corpo or {}).get("respostas", []) or [])
        if isinstance(item, dict)
    }
    for sq in sorted(sim.questoes, key=lambda item: item.ordem_questao):
        payload = respostas_payload.get(str(sq.questao_id), {})
        _salvar_resposta_aluno(
            sessao,
            aluno=aluno,
            simulado=sim,
            tentativa=tentativa,
            questao_id=sq.questao_id,
            alternativa_raw=payload.get("alternativaId"),
            tempo_gasto=_normalizar_tempo_gasto(payload.get("tempoGastoSegundos")),
        )
    respostas_atuais = sessao.scalars(
        select(Resposta).where(
            Resposta.aluno_id == aluno.id,
            Resposta.simulado_id == sim.id,
            Resposta.tentativa_id == tentativa.id,
        )
    ).all()
    tempo_total = sum(int(r.tempo_gasto_segundos or 0) for r in respostas_atuais)
    prova_avancada_service.marcar_tentativa_finalizada(
        tentativa, tempo_total_segundos=tempo_total,
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
    resultado = _computar_resultado(
        sessao,
        aluno.id,
        sim,
        incluir_sem_respostas=True,
        usar_persistido=False,
        tentativa_atual=tentativa,
    )
    prova_avancada_service.salvar_resultado(sessao, tentativa=tentativa, resultado=resultado or {})
    config_resultados = _config_resultados(sessao)
    mostrar_resultado = bool(config_resultados.get("mostrarResultadoImediato", True))
    mostrar_gabarito = bool(config_resultados.get("mostrarGabaritoAoAluno", True))
    if mostrar_resultado:
        prova_avancada_service.notificar(
            sessao,
            destinatarios=[usuario],
            tipo="resultado_disponivel",
            titulo="Resultado disponivel",
            mensagem=f"O resultado da prova {sim.titulo} ja esta disponivel.",
            origem_id=str(sim.id),
            origem_tipo="simulado",
            acao_url=f"/aluno/simulado/{sim.id}/resultado",
            acao_label="Ver resultado",
        )
    sessao.commit()
    if not mostrar_resultado:
        return {
            "ok": True,
            "resultadoDisponivel": False,
            "mensagem": "Respostas enviadas. O resultado ainda nao foi liberado para o aluno.",
        }
    if not mostrar_gabarito:
        resultado = _resultado_sem_gabarito(resultado or {})
    return {
        **(resultado or {}),
        "resultadoDisponivel": True,
        "permissoes": {
            "mostrarResultado": mostrar_resultado,
            "mostrarGabarito": mostrar_gabarito,
        },
    }

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
