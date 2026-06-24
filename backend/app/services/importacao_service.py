from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.exceptions import DadosInvalidos
from app.models import Alternativa, Questao
from app.repositories import etiqueta_repository

CAMPOS_ETIQUETA = ("serie", "materia", "conteudo", "nivel")
MAX_ALTERNATIVAS = 5


@dataclass
class ErroImportacao:
    linha: int
    motivo: str


@dataclass
class RelatorioImportacao:
    importadas: int = 0
    rejeitadas: int = 0
    erros: list[ErroImportacao] = field(default_factory=list)


def _validar_e_construir(sessao: Session, q: dict) -> Questao:
    if not isinstance(q, dict):
        raise ValueError("item não é um objeto JSON")

    enunciado = (q.get("enunciado") or "").strip()
    if not enunciado:
        raise ValueError("enunciado ausente ou vazio")

    etiquetas = q.get("etiquetas") or {}
    faltando = [c for c in CAMPOS_ETIQUETA if not etiquetas.get(c)]
    if faltando:
        raise ValueError(f"etiqueta(s) obrigatória(s) ausente(s): {', '.join(faltando)}")

    serie = etiqueta_repository.serie_por_nome(sessao, etiquetas["serie"])
    if serie is None:
        raise ValueError(f"serie inexistente: '{etiquetas['serie']}'")

    materia = etiqueta_repository.materia_por_nome(sessao, etiquetas["materia"])
    if materia is None:
        raise ValueError(f"materia inexistente: '{etiquetas['materia']}'")

    nivel = etiqueta_repository.nivel_por_nome(sessao, etiquetas["nivel"])
    if nivel is None:
        raise ValueError(f"nivel inexistente: '{etiquetas['nivel']}'")

    conteudo = etiqueta_repository.conteudo_por_nome(
        sessao, etiquetas["conteudo"], materia.id
    )
    if conteudo is None:
        raise ValueError(
            f"conteudo inexistente: '{etiquetas['conteudo']}' "
            f"(na materia '{materia.nome}')"
        )

    alternativas_raw = q.get("alternativas") or []
    if not isinstance(alternativas_raw, list) or len(alternativas_raw) < 2:
        raise ValueError("a questão precisa de pelo menos 2 alternativas")
    if len(alternativas_raw) > MAX_ALTERNATIVAS:
        raise ValueError(
            f"a questão excede o máximo de {MAX_ALTERNATIVAS} alternativas"
        )

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
    questoes = payload.get("questoes")
    if not isinstance(questoes, list):
        raise DadosInvalidos(
            "payload inválido: esperado um objeto com a chave 'questoes' (lista)"
        )

    relatorio = RelatorioImportacao()
    validas: list[Questao] = []

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
