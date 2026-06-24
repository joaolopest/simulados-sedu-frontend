from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models import ConfiguracaoSistema, Usuario
from app.schema_migrations import aplicar_migracoes_idempotentes


DEFAULT_CONFIGURACOES: dict[str, dict[str, Any]] = {
    "provas": {
        "tempoPadraoMinutos": 60,
        "quantidadeMinimaQuestoes": 3,
        "quantidadeMaximaQuestoes": 100,
        "politicaReabertura": "justificativa_obrigatoria",
        "permitirReabrirAposFinalizacao": True,
        "motivoReaberturaMinCaracteres": 5,
    },
    "acessibilidade": {
        "tempoExtraPercentualPadrao": 25,
        "permitirFonteMaior": True,
        "permitirAltoContraste": True,
        "permitirLeituraSimplificada": True,
        "adaptacoesDisponiveis": ["tdah", "dislexia", "deficiencia_visual", "autismo"],
    },
    "resultados": {
        "mostrarGabaritoAoAluno": True,
        "mostrarResultadoImediato": True,
        "notaMinimaRecomendada": 7,
    },
}

DESCRICOES_CONFIGURACOES = {
    "provas": (
        "Regras globais de cria\u00e7\u00e3o, valida\u00e7\u00e3o, "
        "libera\u00e7\u00e3o e reabertura de provas."
    ),
    "acessibilidade": (
        "Par\u00e2metros globais de acessibilidade e adapta\u00e7\u00f5es "
        "pedag\u00f3gicas."
    ),
    "resultados": (
        "Regras globais de visualiza\u00e7\u00e3o e interpreta\u00e7\u00e3o "
        "dos resultados."
    ),
}


def _merge_dict(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    saida = deepcopy(base)
    for chave, valor in (override or {}).items():
        if isinstance(valor, dict) and isinstance(saida.get(chave), dict):
            saida[chave] = _merge_dict(saida[chave], valor)
        else:
            saida[chave] = valor
    return saida


def _normalizar_chave(chave: str) -> str:
    return str(chave or "").strip().lower()


def _normalizar_adaptacao(codigo: object) -> str | None:
    texto = str(codigo or "").strip().lower()
    if not texto:
        return None
    if texto == "baixa_visao":
        return "deficiencia_visual"
    return texto


def _normalizar_valor(chave: str, valor: dict[str, Any]) -> dict[str, Any]:
    if chave != "acessibilidade":
        return valor
    saida = dict(valor or {})
    adaptacoes = saida.get("adaptacoesDisponiveis")
    if isinstance(adaptacoes, list):
        normalizadas = []
        for item in adaptacoes:
            codigo = _normalizar_adaptacao(item)
            if codigo and codigo not in normalizadas:
                normalizadas.append(codigo)
        saida["adaptacoesDisponiveis"] = normalizadas
    return saida


def _schema_faltando(exc: ProgrammingError) -> bool:
    mensagem = str(exc).lower()
    return "undefinedtable" in mensagem or (
        "relation" in mensagem and "does not exist" in mensagem
    )


def _garantir_schema() -> None:
    Base.metadata.create_all(engine)
    aplicar_migracoes_idempotentes(engine)


def _configs_existentes(sessao: Session) -> dict[str, ConfiguracaoSistema]:
    return {
        config.chave: config
        for config in sessao.scalars(select(ConfiguracaoSistema)).all()
    }


def garantir_defaults(sessao: Session) -> None:
    try:
        existentes = _configs_existentes(sessao)
    except ProgrammingError as exc:
        if not _schema_faltando(exc):
            raise
        sessao.rollback()
        _garantir_schema()
        existentes = _configs_existentes(sessao)

    for chave, valor in DEFAULT_CONFIGURACOES.items():
        descricao = DESCRICOES_CONFIGURACOES.get(chave)
        registro = existentes.get(chave)
        if registro is not None:
            if descricao and registro.descricao != descricao:
                registro.descricao = descricao
            continue
        sessao.add(
            ConfiguracaoSistema(
                chave=chave,
                valor_json=deepcopy(valor),
                descricao=descricao,
            )
        )


def listar(sessao: Session) -> list[ConfiguracaoSistema]:
    garantir_defaults(sessao)
    sessao.flush()
    return list(
        sessao.scalars(
            select(ConfiguracaoSistema).order_by(ConfiguracaoSistema.chave.asc())
        ).all()
    )


def obter_valor(sessao: Session, chave: str) -> dict[str, Any]:
    chave_norm = _normalizar_chave(chave)
    base = DEFAULT_CONFIGURACOES.get(chave_norm, {})
    registro = sessao.scalar(
        select(ConfiguracaoSistema).where(ConfiguracaoSistema.chave == chave_norm)
    )
    if registro is None:
        return deepcopy(base)
    return _normalizar_valor(chave_norm, _merge_dict(base, registro.valor_json or {}))


def atualizar(
    sessao: Session,
    *,
    chave: str,
    valor: dict[str, Any],
    usuario: Usuario | None,
) -> ConfiguracaoSistema:
    chave_norm = _normalizar_chave(chave)
    if chave_norm not in DEFAULT_CONFIGURACOES:
        raise ValueError("Configura\u00e7\u00e3o desconhecida.")
    registro = sessao.scalar(
        select(ConfiguracaoSistema).where(ConfiguracaoSistema.chave == chave_norm)
    )
    if registro is None:
        registro = ConfiguracaoSistema(
            chave=chave_norm,
            descricao=DESCRICOES_CONFIGURACOES.get(chave_norm),
        )
        sessao.add(registro)

    registro.valor_json = _normalizar_valor(
        chave_norm, _merge_dict(DEFAULT_CONFIGURACOES[chave_norm], valor or {})
    )
    registro.atualizado_por_id = usuario.id if usuario else None
    registro.atualizado_em = datetime.now(timezone.utc)
    sessao.flush()
    return registro


def config_provas(sessao: Session) -> dict[str, Any]:
    return obter_valor(sessao, "provas")


def config_acessibilidade(sessao: Session) -> dict[str, Any]:
    return obter_valor(sessao, "acessibilidade")
