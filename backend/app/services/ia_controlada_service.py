from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import dominio_labels as labels
from app.models import Aluno, Questao, Resposta, ResultadoSimulado


MODELO_LOCAL = "heuristico-local-v1"


def _lista(valor: Any) -> list[str]:
    if isinstance(valor, list):
        return [str(item).strip() for item in valor if str(item).strip()]
    if valor is None:
        return []
    texto = str(valor).strip()
    return [texto] if texto else []


def _clamp(valor: Any, minimo: int, maximo: int, padrao: int) -> int:
    try:
        inteiro = int(valor)
    except (TypeError, ValueError):
        inteiro = padrao
    return max(minimo, min(maximo, inteiro))


def _guardrails_rascunho(rascunho: dict) -> list[dict]:
    alternativas = rascunho.get("alternativas") or []
    corretas = [alt for alt in alternativas if alt.get("correta")]
    alertas = []
    if len(str(rascunho.get("enunciado") or "")) < 30:
        alertas.append({"codigo": "enunciado_curto", "mensagem": "Revise o enunciado."})
    if len(alternativas) < 4:
        alertas.append({"codigo": "poucas_alternativas", "mensagem": "Use ao menos 4 alternativas."})
    if len(corretas) != 1:
        alertas.append({"codigo": "gabarito_invalido", "mensagem": "Marque exatamente 1 alternativa correta."})
    if not rascunho.get("conteudo"):
        alertas.append({"codigo": "conteudo_ausente", "mensagem": "Informe o conteudo."})
    return alertas


def gerar_rascunhos_questoes(parametros: dict) -> dict:
    quantidade = _clamp(parametros.get("quantidade"), 1, 10, 3)
    serie = labels.serie_nome(parametros.get("serie")) or str(parametros.get("serie") or "")
    materia = labels.materia_nome(str(parametros.get("materia") or ""))
    nivel = labels.MAP_NIVEL.get(parametros.get("nivel"), parametros.get("nivel") or "Medio")
    conteudo = str(parametros.get("conteudo") or "").strip()
    competencias = _lista(parametros.get("competencias"))
    adaptacoes = _lista(parametros.get("adaptacoes"))
    habilidade = str(
        parametros.get("habilidade") or (competencias[0] if competencias else "")
    ).strip()

    rascunhos = []
    for indice in range(1, quantidade + 1):
        foco = habilidade or conteudo or materia or "conteudo informado"
        enunciado = (
            f"Em uma situacao-problema de {conteudo or materia}, avalie {foco} "
            f"e selecione a alternativa mais adequada. Item {indice}."
        )
        rascunho = {
            "enunciado": enunciado,
            "serie": serie,
            "materia": materia,
            "conteudo": conteudo,
            "nivel": nivel,
            "adaptacoes": adaptacoes,
            "competencias": competencias,
            "tempoEstimadoSegundos": 90,
            "explicacao": (
                "Rascunho gerado para revisao humana. Ajuste contexto, gabarito "
                "e distratores antes de publicar."
            ),
            "alternativas": [
                {"texto": "Resposta correta a ser revisada pelo professor.", "correta": True},
                {"texto": "Distrator plausivel relacionado ao erro conceitual 1.", "correta": False},
                {"texto": "Distrator plausivel relacionado ao erro conceitual 2.", "correta": False},
                {"texto": "Distrator plausivel relacionado ao erro de leitura.", "correta": False},
            ],
        }
        alertas = _guardrails_rascunho(rascunho)
        rascunhos.append(
            {
                **rascunho,
                "alertasGuardrail": alertas,
                "confiancaPercentual": 58 if alertas else 72,
                "revisaoHumanaObrigatoria": True,
            }
        )

    return {
        "modo": MODELO_LOCAL,
        "geradoEm": datetime.now(timezone.utc).isoformat(),
        "revisaoHumanaObrigatoria": True,
        "politicaPublicacao": "IA nunca publica automaticamente; salve como rascunho e publique apos revisao.",
        "rascunhos": rascunhos,
    }


def plano_reforco_aluno(sessao: Session, aluno: Aluno) -> dict:
    respostas = sessao.scalars(
        select(Resposta).where(Resposta.aluno_id == aluno.id)
    ).all()
    problemas = [
        r
        for r in respostas
        if r.status == "em_branco" or (r.status == "respondida" and not r.correta)
    ]
    por_conteudo: Counter[str] = Counter()
    por_competencia: Counter[str] = Counter()
    for resposta in problemas:
        questao: Questao | None = resposta.questao
        if not questao:
            continue
        por_conteudo[questao.conteudo.nome if questao.conteudo else "Sem conteudo"] += 1
        for competencia in questao.competencias or []:
            por_competencia[str(competencia)] += 1

    resultados = sessao.scalars(
        select(ResultadoSimulado)
        .where(ResultadoSimulado.aluno_id == aluno.id)
        .order_by(ResultadoSimulado.criado_em.desc())
        .limit(5)
    ).all()
    notas = [
        float((resultado.resultado_json or {}).get("notaFinal", 0))
        for resultado in resultados
    ]
    media = round(sum(notas) / len(notas), 1) if notas else None

    conteudos = [
        {"conteudo": nome, "ocorrencias": total}
        for nome, total in por_conteudo.most_common(5)
    ]
    competencias = [
        {"competencia": nome, "ocorrencias": total}
        for nome, total in por_competencia.most_common(5)
    ]
    recomendacoes = [
        f"Revisar {item['conteudo']} com exercicios graduais."
        for item in conteudos[:3]
    ]
    if not recomendacoes:
        recomendacoes = ["Manter rotina de revisao e resolver itens de nivel progressivo."]

    return {
        "modo": MODELO_LOCAL,
        "geradoEm": datetime.now(timezone.utc).isoformat(),
        "alunoId": str(aluno.id),
        "mediaRecente": media,
        "conteudosPrioritarios": conteudos,
        "competenciasPrioritarias": competencias,
        "recomendacoes": recomendacoes,
        "revisaoHumanaObrigatoria": True,
        "observacao": "Plano calculado por heuristicas locais; professor/suporte deve validar antes de aplicar.",
    }
