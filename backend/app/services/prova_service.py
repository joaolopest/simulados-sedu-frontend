"""Camada de SERVIÇO: geração de prova/simulado.

Aqui mora a REGRA DE NEGÓCIO. A API e a CLI só chamam `gerar_prova`.

CAMINHO DA GERAÇÃO DE PROVA (passo a passo):
    1. Recebe os parâmetros do gestor (série, matéria, conteúdos, distribuição
       por nível, quantidade, adaptações).
    2. Pede ao repositório as questões candidatas (filtro clássico no banco).
    3. Seleciona respeitando a distribuição de dificuldade pedida
       (ex.: 30% fácil, 50% médio, 20% difícil).
    4. Embaralha as alternativas de cada questão SEM desvincular do enunciado
       (o vínculo é a FK; o que muda é só a ordem de exibição).
    5. Monta e devolve a prova: questões em ordem + alternativas embaralhadas
       + gabarito (qual letra é a correta depois do embaralhamento).

OBS: no produto final, esta etapa de seleção é refinada pela IA (Claude API)
para garantir coerência pedagógica. Aqui implementamos a seleção clássica,
que também serve de FALLBACK quando a IA está indisponível (ver backlog, seção 7).
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional, Sequence

from sqlalchemy.orm import Session

from app.models import Questao
from app.repositories import questao_repository

LETRAS = "ABCDE"


@dataclass
class AlternativaProva:
    letra: str
    texto: str
    alternativa_id: int


@dataclass
class QuestaoProva:
    ordem: int
    questao_id: int
    enunciado: str
    materia: str
    conteudo: str
    nivel: str
    alternativas: list[AlternativaProva]
    gabarito: str  # letra correta após o embaralhamento


@dataclass
class Prova:
    serie: str
    materia: str
    total: int
    distribuicao_real: dict[str, int]
    questoes: list[QuestaoProva] = field(default_factory=list)

    def gabarito_dict(self) -> dict[int, str]:
        """Mapa {ordem_da_questao: letra_correta} — útil para correção."""
        return {q.ordem: q.gabarito for q in self.questoes}


def _selecionar_por_distribuicao(
    candidatas: list[Questao],
    distribuicao: dict[str, float],
    quantidade: int,
    rng: random.Random,
) -> list[Questao]:
    """Escolhe `quantidade` questões respeitando proporção por nível.

    Se faltar questão de algum nível, completa com o que houver disponível.
    """
    por_nivel: dict[str, list[Questao]] = {}
    for q in candidatas:
        por_nivel.setdefault(q.nivel.nome, []).append(q)
    for lista in por_nivel.values():
        rng.shuffle(lista)

    selecionadas: list[Questao] = []
    for nivel_nome, proporcao in distribuicao.items():
        alvo = round(quantidade * proporcao)
        disponiveis = por_nivel.get(nivel_nome, [])
        selecionadas.extend(disponiveis[:alvo])

    # Completa (ou corta) para bater exatamente a quantidade pedida
    if len(selecionadas) < quantidade:
        ja_escolhidas = {id(q) for q in selecionadas}
        resto = [q for q in candidatas if id(q) not in ja_escolhidas]
        rng.shuffle(resto)
        selecionadas.extend(resto[: quantidade - len(selecionadas)])

    rng.shuffle(selecionadas)
    return selecionadas[:quantidade]


def gerar_prova(
    sessao: Session,
    *,
    serie: str,
    materia: str,
    conteudos: Optional[Sequence[str]] = None,
    distribuicao: Optional[dict[str, float]] = None,
    quantidade: int = 10,
    adaptacoes: Optional[Sequence[str]] = None,
    seed: Optional[int] = None,
) -> Prova:
    """Gera uma prova a partir do banco de questões. Função pura e testável.

    `seed` fixo torna o resultado reproduzível (bom para testes e demonstração).
    """
    rng = random.Random(seed)

    candidatas = questao_repository.filtrar_questoes(
        sessao,
        serie=serie,
        materia=materia,
        conteudos=conteudos,
        adaptacoes=adaptacoes,
    )

    if not candidatas:
        raise ValueError(
            "Nenhuma questão encontrada para os filtros informados. "
            "Verifique série/matéria/conteúdos ou popule o banco."
        )

    if distribuicao:
        selecionadas = _selecionar_por_distribuicao(
            candidatas, distribuicao, quantidade, rng
        )
    else:
        rng.shuffle(candidatas)
        selecionadas = candidatas[:quantidade]

    questoes_prova: list[QuestaoProva] = []
    contagem_nivel: dict[str, int] = {}

    for ordem, questao in enumerate(selecionadas, start=1):
        # Embaralha as alternativas SEM tocar no banco (cópia em memória)
        alternativas = list(questao.alternativas)
        rng.shuffle(alternativas)

        alts_prova: list[AlternativaProva] = []
        gabarito = "?"
        for letra, alt in zip(LETRAS, alternativas):
            alts_prova.append(
                AlternativaProva(letra=letra, texto=alt.texto, alternativa_id=alt.id)
            )
            if alt.correta:
                gabarito = letra

        contagem_nivel[questao.nivel.nome] = contagem_nivel.get(questao.nivel.nome, 0) + 1

        questoes_prova.append(
            QuestaoProva(
                ordem=ordem,
                questao_id=questao.id,
                enunciado=questao.enunciado,
                materia=questao.materia.nome,
                conteudo=questao.conteudo.nome,
                nivel=questao.nivel.nome,
                alternativas=alts_prova,
                gabarito=gabarito,
            )
        )

    return Prova(
        serie=serie,
        materia=materia,
        total=len(questoes_prova),
        distribuicao_real=contagem_nivel,
        questoes=questoes_prova,
    )
