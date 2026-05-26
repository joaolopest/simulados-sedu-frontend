"""Serviço de cadastro individual de questão (usado pelo formulário/demo).

Diferente da importação em lote (importacao_service, que é estrita por ser
alimentada por JSON externo), o cadastro manual é feito por um Admin de forma
deliberada — então criamos matéria/conteúdo na hora se ainda não existirem.
Série e Nível continuam restritos aos valores de etiqueta já cadastrados.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alternativa, Conteudo, Materia, Nivel, Questao, Serie


def cadastrar_questao(
    sessao: Session,
    *,
    enunciado: str,
    serie: str,
    materia: str,
    conteudo: str,
    nivel: str,
    alternativas: list[dict],
    adaptacoes: list[str] | None = None,
    imagem_url: str | None = None,
) -> Questao:
    enunciado = (enunciado or "").strip()
    if not enunciado:
        raise ValueError("enunciado é obrigatório")

    serie_obj = sessao.scalar(select(Serie).where(Serie.nome == serie))
    if serie_obj is None:
        raise ValueError(f"série inexistente: '{serie}'")

    nivel_obj = sessao.scalar(select(Nivel).where(Nivel.nome == nivel))
    if nivel_obj is None:
        raise ValueError(f"nível inexistente: '{nivel}'")

    # Matéria e conteúdo são criados na hora se não existirem (cadastro manual)
    materia_obj = sessao.scalar(select(Materia).where(Materia.nome == materia))
    if materia_obj is None:
        materia_obj = Materia(nome=materia.strip())
        sessao.add(materia_obj)
        sessao.flush()

    conteudo_nome = (conteudo or "").strip()
    if not conteudo_nome:
        raise ValueError("conteúdo é obrigatório")
    conteudo_obj = sessao.scalar(
        select(Conteudo).where(
            Conteudo.nome == conteudo_nome,
            Conteudo.materia_id == materia_obj.id,
        )
    )
    if conteudo_obj is None:
        conteudo_obj = Conteudo(nome=conteudo_nome, materia=materia_obj)
        sessao.add(conteudo_obj)
        sessao.flush()

    if not isinstance(alternativas, list) or len(alternativas) < 2:
        raise ValueError("informe ao menos 2 alternativas")
    corretas = [a for a in alternativas if a.get("correta")]
    if len(corretas) != 1:
        raise ValueError("marque exatamente 1 alternativa como correta")

    objs_alt: list[Alternativa] = []
    for i, a in enumerate(alternativas, start=1):
        texto = (a.get("texto") or "").strip()
        if not texto:
            raise ValueError(f"alternativa {i} está sem texto")
        objs_alt.append(
            Alternativa(texto=texto, correta=bool(a.get("correta")), ordem_original=i)
        )

    questao = Questao(
        enunciado=enunciado,
        imagem_url=imagem_url,
        serie=serie_obj,
        materia=materia_obj,
        conteudo=conteudo_obj,
        nivel=nivel_obj,
        adaptacoes=adaptacoes or [],
        alternativas=objs_alt,
    )
    sessao.add(questao)
    sessao.commit()
    sessao.refresh(questao)
    return questao
