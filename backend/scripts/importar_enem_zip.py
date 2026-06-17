"""Importa questoes do ZIP da API ENEM para o banco da aplicacao.

Uso:
    python scripts/importar_enem_zip.py --zip C:\\Projects\\Dev\\enem-api-main.zip

O importador e idempotente por marcador de origem em `questoes.competencias`.
Ele nao extrai o ZIP para dentro do repositorio e nao apaga dados existentes.
"""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.enums import PerfilUsuario, StatusQuestao  # noqa: E402
from app.models import (  # noqa: E402
    AcaoAuditoria,
    Alternativa,
    Conteudo,
    Materia,
    Nivel,
    Questao,
    Serie,
    Usuario,
)


ROOT_ZIP = "enem-api-main"
SERIE_ENEM = "3ª série EM"
NIVEL_ENEM = "Médio"

DISCIPLINA_LABEL = {
    "ciencias-humanas": "Ciências Humanas",
    "ciencias-natureza": "Ciências da Natureza",
    "linguagens": "Linguagens",
    "matematica": "Matemática",
}

IDIOMA_LABEL = {
    "ingles": "Inglês",
    "espanhol": "Espanhol",
}


@dataclass
class ResultadoImportacao:
    importadas: int = 0
    ignoradas: int = 0
    rejeitadas: int = 0


def _argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Importa o acervo de questoes do ENEM para Postgres/Supabase."
    )
    parser.add_argument(
        "--zip",
        dest="zip_path",
        required=True,
        help="Caminho do enem-api-main.zip.",
    )
    parser.add_argument(
        "--ano",
        type=int,
        action="append",
        help="Ano especifico para importar. Pode repetir. Sem este filtro importa todos.",
    )
    parser.add_argument(
        "--limite",
        type=int,
        default=None,
        help="Limite total de questoes, util para teste rapido.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Valida o ZIP e mostra contagem sem gravar no banco.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=250,
        help="Quantidade de questoes novas por commit. Ignorado em dry-run.",
    )
    return parser.parse_args()


def _get_or_create(sessao, modelo, nome: str):
    obj = sessao.scalar(select(modelo).where(modelo.nome == nome))
    if obj is None:
        obj = modelo(nome=nome)
        sessao.add(obj)
        sessao.flush()
    return obj


def _materia_e_conteudo(disciplina: str, idioma: str | None) -> tuple[str, str, str]:
    if idioma:
        materia = IDIOMA_LABEL.get(idioma, idioma.title())
        return materia, f"ENEM - {materia}", materia

    materia = DISCIPLINA_LABEL.get(disciplina, disciplina.replace("-", " ").title())
    return materia, f"ENEM - {materia}", materia


def _source_id(item: dict) -> str:
    idioma = item.get("language") or "regular"
    return f"enem:{item['year']}:{item['index']}:{idioma}"


def _enunciado(item: dict) -> str:
    partes = []
    contexto = (item.get("context") or "").strip()
    introducao = (item.get("alternativesIntroduction") or "").strip()
    if contexto:
        partes.append(contexto)
    if introducao:
        partes.append(introducao)
    return "\n\n".join(partes) or item.get("title") or "Questao ENEM"


def _alternativas(item: dict) -> list[Alternativa]:
    saida: list[Alternativa] = []
    correta = item.get("correctAlternative")
    for ordem, alternativa in enumerate(item.get("alternatives") or [], start=1):
        texto = (alternativa.get("text") or "").strip()
        arquivo = alternativa.get("file")
        if arquivo:
            texto = f"{texto}\n\nImagem da alternativa: {arquivo}".strip()
        if not texto:
            texto = f"Alternativa {alternativa.get('letter') or ordem}"
        saida.append(
            Alternativa(
                texto=texto,
                correta=bool(alternativa.get("isCorrect"))
                or alternativa.get("letter") == correta,
                ordem_original=ordem,
            )
        )
    return saida


def _questao_path(ano: int, indice: int, idioma: str | None) -> str:
    sufixo = f"-{idioma}" if idioma else ""
    return f"{ROOT_ZIP}/public/{ano}/questions/{indice}{sufixo}/details.json"


def _ids_enem_existentes(sessao) -> set[str]:
    ids: set[str] = set()
    for competencias in sessao.scalars(select(Questao.competencias)):
        if not isinstance(competencias, list):
            continue
        for valor in competencias:
            if isinstance(valor, str) and valor.startswith("enem:"):
                ids.add(valor)
    return ids


def _cache_materias(sessao) -> dict[str, Materia]:
    return {m.nome: m for m in sessao.scalars(select(Materia))}


def _cache_conteudos(sessao) -> dict[tuple[int, str], Conteudo]:
    return {(c.materia_id, c.nome): c for c in sessao.scalars(select(Conteudo))}


def _usuario_admin(sessao) -> Usuario | None:
    admin = sessao.scalar(
        select(Usuario).where(Usuario.email == "admin@sedu.se.gov.br")
    )
    if admin is not None:
        return admin
    return sessao.scalar(
        select(Usuario).where(Usuario.perfil == PerfilUsuario.ADMIN).order_by(Usuario.id)
    )


def importar(
    zip_path: Path,
    anos: set[int] | None,
    limite: int | None,
    dry_run: bool,
    batch_size: int,
) -> ResultadoImportacao:
    resultado = ResultadoImportacao()

    with zipfile.ZipFile(zip_path) as arquivo, SessionLocal() as sessao:
        nomes_zip = set(arquivo.namelist())
        serie = _get_or_create(sessao, Serie, SERIE_ENEM)
        nivel = _get_or_create(sessao, Nivel, NIVEL_ENEM)
        admin = _usuario_admin(sessao)
        existentes = _ids_enem_existentes(sessao)
        materias_cache = _cache_materias(sessao)
        conteudos_cache = _cache_conteudos(sessao)

        exams = json.loads(arquivo.read(f"{ROOT_ZIP}/public/exams.json"))
        total_lidas = 0
        novas_no_lote = 0

        for exam in exams:
            ano = int(exam["year"])
            if anos and ano not in anos:
                continue

            detalhes = json.loads(arquivo.read(f"{ROOT_ZIP}/public/{ano}/details.json"))
            for resumo in detalhes.get("questions") or []:
                if limite is not None and total_lidas >= limite:
                    break
                caminho = _questao_path(ano, int(resumo["index"]), resumo.get("language"))
                if caminho not in nomes_zip:
                    resultado.rejeitadas += 1
                    continue

                item = json.loads(arquivo.read(caminho))
                origem = _source_id(item)
                if origem in existentes:
                    resultado.ignoradas += 1
                    total_lidas += 1
                    continue

                materia_nome, conteudo_nome, area_label = _materia_e_conteudo(
                    item.get("discipline") or "", item.get("language")
                )
                materia = materias_cache.get(materia_nome)
                if materia is None:
                    materia = Materia(nome=materia_nome)
                    sessao.add(materia)
                    sessao.flush()
                    materias_cache[materia_nome] = materia

                conteudo = conteudos_cache.get((materia.id, conteudo_nome))
                if conteudo is None:
                    conteudo = Conteudo(nome=conteudo_nome, materia_id=materia.id)
                    sessao.add(conteudo)
                    sessao.flush()
                    conteudos_cache[(materia.id, conteudo_nome)] = conteudo

                alternativas = _alternativas(item)
                if len(alternativas) < 2 or sum(1 for alt in alternativas if alt.correta) != 1:
                    resultado.rejeitadas += 1
                    total_lidas += 1
                    continue

                arquivos = item.get("files") or []
                imagem_url = arquivos[0][:255] if arquivos else None
                competencias = [
                    origem,
                    "ENEM",
                    str(ano),
                    area_label,
                ]
                if item.get("language"):
                    competencias.append(f"idioma:{item['language']}")

                questao = Questao(
                    enunciado=_enunciado(item),
                    imagem_url=imagem_url,
                    serie_id=serie.id,
                    materia_id=materia.id,
                    conteudo_id=conteudo.id,
                    nivel_id=nivel.id,
                    adaptacoes=[],
                    status=StatusQuestao.PUBLICADA,
                    tempo_estimado_segundos=180,
                    competencias=competencias,
                    explicacao=(
                        f"Fonte: ENEM {ano}, questao {item['index']}. "
                        f"Area: {area_label}."
                    ),
                    criado_por_id=admin.id if admin else None,
                    escola_id=None,
                    alternativas=alternativas,
                )
                sessao.add(questao)
                existentes.add(origem)
                resultado.importadas += 1
                novas_no_lote += 1
                total_lidas += 1

                if not dry_run and novas_no_lote >= max(1, batch_size):
                    sessao.commit()
                    novas_no_lote = 0

            if limite is not None and total_lidas >= limite:
                break

        if dry_run:
            sessao.rollback()
            return resultado

        if resultado.importadas:
            sessao.add(
                AcaoAuditoria(
                    tipo="importar_questoes",
                    usuario_id=admin.id if admin else None,
                    usuario_nome=admin.nome if admin else "Sistema",
                    alvo_tipo="questao",
                    detalhes=(
                        f"Importou acervo ENEM: {resultado.importadas} novas, "
                        f"{resultado.ignoradas} ja existentes, "
                        f"{resultado.rejeitadas} rejeitadas."
                    ),
                )
            )
        sessao.commit()

    return resultado


def main() -> None:
    args = _argumentos()
    zip_path = Path(args.zip_path).expanduser().resolve()
    if not zip_path.exists():
        raise SystemExit(f"ZIP nao encontrado: {zip_path}")

    anos = set(args.ano) if args.ano else None
    resultado = importar(zip_path, anos, args.limite, args.dry_run, args.batch_size)
    modo = "dry-run" if args.dry_run else "gravado"
    print(f"Importacao ENEM ({modo})")
    print(f"  importadas: {resultado.importadas}")
    print(f"  ignoradas: {resultado.ignoradas}")
    print(f"  rejeitadas: {resultado.rejeitadas}")


if __name__ == "__main__":
    main()
