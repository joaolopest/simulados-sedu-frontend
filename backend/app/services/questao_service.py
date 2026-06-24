from __future__ import annotations

from sqlalchemy.orm import Session

from app.exceptions import DadosInvalidos, NaoEncontrado
from app.models import Alternativa, Conteudo, Materia, Questao
from app.repositories import etiqueta_repository

MAX_ALTERNATIVAS = 5


def _validar_alternativas(alternativas: list[dict]) -> list[Alternativa]:
    if not isinstance(alternativas, list) or len(alternativas) < 2:
        raise DadosInvalidos("informe ao menos 2 alternativas")
    if len(alternativas) > MAX_ALTERNATIVAS:
        raise DadosInvalidos(
            f"o máximo de alternativas por questão é {MAX_ALTERNATIVAS}"
        )
    corretas = [a for a in alternativas if a.get("correta")]
    if len(corretas) != 1:
        raise DadosInvalidos("marque exatamente 1 alternativa como correta")

    objs: list[Alternativa] = []
    for i, a in enumerate(alternativas, start=1):
        texto = (a.get("texto") or "").strip()
        if not texto:
            raise DadosInvalidos(f"alternativa {i} está sem texto")
        objs.append(
            Alternativa(texto=texto, correta=bool(a.get("correta")), ordem_original=i)
        )
    return objs


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
        raise DadosInvalidos("enunciado é obrigatório")

    serie_obj = etiqueta_repository.serie_por_nome(sessao, serie)
    if serie_obj is None:
        raise NaoEncontrado(f"série inexistente: '{serie}'")

    nivel_obj = etiqueta_repository.nivel_por_nome(sessao, nivel)
    if nivel_obj is None:
        raise NaoEncontrado(f"nível inexistente: '{nivel}'")

    objs_alt = _validar_alternativas(alternativas)

    materia_obj = etiqueta_repository.materia_por_nome(sessao, materia)
    if materia_obj is None:
        materia_obj = Materia(nome=materia.strip())
        sessao.add(materia_obj)
        sessao.flush()

    conteudo_nome = (conteudo or "").strip()
    if not conteudo_nome:
        raise DadosInvalidos("conteúdo é obrigatório")
    conteudo_obj = etiqueta_repository.conteudo_por_nome(
        sessao, conteudo_nome, materia_obj.id
    )
    if conteudo_obj is None:
        conteudo_obj = Conteudo(nome=conteudo_nome, materia=materia_obj)
        sessao.add(conteudo_obj)
        sessao.flush()

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
