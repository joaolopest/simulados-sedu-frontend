"""Serviço de IMPORTAÇÃO de questões a partir de JSON (Épico 3 — US T-01).

Recebe o JSON da SEDUC (cada questão = cabeçalho + etiquetas + alternativas),
valida questão a questão e devolve um RELATÓRIO: quantas entraram, quantas
foram rejeitadas e o motivo de cada rejeição (por linha/índice).

Regras (conforme backlog v4):
    - Questão sem metadado obrigatório é rejeitada (não derruba a importação toda).
    - Etiqueta (série/matéria/conteúdo/nível) inexistente => questão rejeitada,
      com o motivo apontando qual etiqueta não bateu.
    - Precisa ter ao menos 2 alternativas e exatamente uma correta.
    - As questões válidas são persistidas; as inválidas entram no array de erros.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alternativa, Conteudo, Materia, Nivel, Questao, Serie

CAMPOS_ETIQUETA = ("serie", "materia", "conteudo", "nivel")


@dataclass
class ErroImportacao:
    linha: int
    motivo: str


@dataclass
class RelatorioImportacao:
    importadas: int = 0
    rejeitadas: int = 0
    erros: list[ErroImportacao] = field(default_factory=list)


def _buscar(sessao: Session, modelo, nome: str):
    return sessao.scalar(select(modelo).where(modelo.nome == nome))


def _validar_e_construir(sessao: Session, q: dict) -> Questao:
    """Valida um dict de questão e devolve um objeto Questao (transitório).

    Levanta ValueError com mensagem clara se algo estiver errado.
    """
    if not isinstance(q, dict):
        raise ValueError("item não é um objeto JSON")

    enunciado = (q.get("enunciado") or "").strip()
    if not enunciado:
        raise ValueError("enunciado ausente ou vazio")

    etiquetas = q.get("etiquetas") or {}
    faltando = [c for c in CAMPOS_ETIQUETA if not etiquetas.get(c)]
    if faltando:
        raise ValueError(f"etiqueta(s) obrigatória(s) ausente(s): {', '.join(faltando)}")

    serie = _buscar(sessao, Serie, etiquetas["serie"])
    if serie is None:
        raise ValueError(f"serie inexistente: '{etiquetas['serie']}'")

    materia = _buscar(sessao, Materia, etiquetas["materia"])
    if materia is None:
        raise ValueError(f"materia inexistente: '{etiquetas['materia']}'")

    nivel = _buscar(sessao, Nivel, etiquetas["nivel"])
    if nivel is None:
        raise ValueError(f"nivel inexistente: '{etiquetas['nivel']}'")

    conteudo = sessao.scalar(
        select(Conteudo).where(
            Conteudo.nome == etiquetas["conteudo"],
            Conteudo.materia_id == materia.id,
        )
    )
    if conteudo is None:
        raise ValueError(
            f"conteudo inexistente: '{etiquetas['conteudo']}' "
            f"(na materia '{materia.nome}')"
        )

    alternativas_raw = q.get("alternativas") or []
    if not isinstance(alternativas_raw, list) or len(alternativas_raw) < 2:
        raise ValueError("a questão precisa de pelo menos 2 alternativas")

    corretas = [a for a in alternativas_raw if a.get("correta")]
    if len(corretas) == 0:
        raise ValueError("alternativa correta ausente")
    if len(corretas) > 1:
        raise ValueError("mais de uma alternativa marcada como correta")

    alternativas: list[Alternativa] = []
    for i, a in enumerate(alternativas_raw, start=1):
        texto = (a.get("texto") or "").strip()
        if not texto:
            raise ValueError(f"alternativa {i} sem texto")
        alternativas.append(
            Alternativa(
                texto=texto,
                correta=bool(a.get("correta", False)),
                ordem_original=int(a.get("ordem_original", i)),
            )
        )

    adaptacoes = q.get("adaptacoes") or []
    if not isinstance(adaptacoes, list):
        raise ValueError("campo 'adaptacoes' deve ser uma lista")

    return Questao(
        enunciado=enunciado,
        imagem_url=q.get("imagem_url"),
        serie=serie,
        materia=materia,
        conteudo=conteudo,
        nivel=nivel,
        adaptacoes=adaptacoes,
        alternativas=alternativas,
    )


def importar_questoes(sessao: Session, payload: dict) -> RelatorioImportacao:
    """Importa um lote de questões. Persiste só as válidas; reporta as inválidas."""
    questoes = payload.get("questoes")
    if not isinstance(questoes, list):
        raise ValueError(
            "payload inválido: esperado um objeto com a chave 'questoes' (lista)"
        )

    relatorio = RelatorioImportacao()
    validas: list[Questao] = []

    # no_autoflush: as questões válidas só vão para a sessão no add_all final.
    # Sem isto, as consultas de etiqueta disparariam autoflush prematuro dos
    # objetos ainda transitórios (gera SAWarning).
    with sessao.no_autoflush:
        for indice, q in enumerate(questoes, start=1):
            try:
                validas.append(_validar_e_construir(sessao, q))
                relatorio.importadas += 1
            except (ValueError, TypeError) as exc:
                relatorio.rejeitadas += 1
                relatorio.erros.append(ErroImportacao(linha=indice, motivo=str(exc)))

    if validas:
        sessao.add_all(validas)
        sessao.commit()

    return relatorio
