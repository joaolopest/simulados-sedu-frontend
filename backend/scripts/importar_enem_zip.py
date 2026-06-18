"""Importa questoes do ZIP da API ENEM para o banco da aplicacao.

Uso:
    python scripts/importar_enem_zip.py --zip C:\\Projects\\Dev\\enem-api-main.zip

O importador e idempotente por marcador de origem em `questoes.competencias`.
Ele nao extrai o ZIP para dentro do repositorio e nao apaga dados existentes.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import String, select

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


MARKDOWN_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
HTML_TAG_RE = re.compile(r"<[^>]+>")
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")


@dataclass
class ResultadoImportacao:
    importadas: int = 0
    atualizadas: int = 0
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
        "--atualizar-existentes",
        action="store_true",
        help="Atualiza etiquetas/enunciados/imagens de questoes ENEM ja importadas.",
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
        idioma_label = IDIOMA_LABEL.get(idioma, idioma.title())
        return "Linguagens", f"ENEM - {idioma_label}", "Linguagens"

    materia = DISCIPLINA_LABEL.get(disciplina, disciplina.replace("-", " ").title())
    return materia, f"ENEM - {materia}", materia


def _source_id(item: dict) -> str:
    idioma = item.get("language") or "regular"
    return f"enem:{item['year']}:{item['index']}:{idioma}"


def _limpar_texto(texto: str | None) -> str:
    if not texto:
        return ""
    texto = html.unescape(texto)
    texto = MARKDOWN_IMAGE_RE.sub(_texto_imagem_markdown, texto)
    texto = MARKDOWN_LINK_RE.sub(lambda m: m.group(1).strip(), texto)
    texto = re.sub(r"(\*\*|__)(.*?)\1", r"\2", texto)
    texto = re.sub(r"(?<!\w)(\*|_)([^*_]+?)\1(?!\w)", r"\2", texto)
    texto = re.sub(r"<br\s*/?>", "\n", texto, flags=re.IGNORECASE)
    texto = re.sub(r"</p\s*>", "\n", texto, flags=re.IGNORECASE)
    texto = HTML_TAG_RE.sub("", texto)
    texto = texto.replace("\xa0", " ")
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n[ \t]+", "\n", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


def _limpar_alt_markdown(texto: str) -> str:
    texto = texto.replace(r"\leq", "<=").replace(r"\geq", ">=")
    texto = texto.replace(r"\neq", "!=").replace(r"\=", "=")
    texto = texto.replace("\\", "")
    return texto.strip()


def _url_limpa(url: str) -> str:
    return url.strip().strip('"').split()[0].strip('"')


def _url_eh_imagem(url: str) -> bool:
    url_base = _url_limpa(url).split("?", 1)[0].lower()
    return url_base.endswith(IMAGE_EXTENSIONS)


def _texto_imagem_markdown(match: re.Match[str]) -> str:
    alt = (match.group(1) or "").strip()
    url = _url_limpa(match.group(2) or "")
    if alt and url.lower().split("?", 1)[0].endswith(".latex"):
        return _limpar_alt_markdown(alt)
    return ""


def _imagem_url(item: dict) -> str | None:
    arquivos = item.get("files") or []
    for arquivo in arquivos:
        if _url_eh_imagem(arquivo):
            return _url_limpa(arquivo)[:255]
    bruto = "\n".join(
        p for p in (item.get("context"), item.get("alternativesIntroduction")) if p
    )
    for match in MARKDOWN_IMAGE_RE.finditer(bruto):
        url = _url_limpa(match.group(2))
        if url and "broken-image" not in url and _url_eh_imagem(url):
            return url[:255]
    return None


def _enunciado(item: dict) -> str:
    partes = []
    contexto = _limpar_texto(item.get("context"))
    introducao = _limpar_texto(item.get("alternativesIntroduction"))
    if contexto:
        partes.append(contexto)
    if introducao:
        partes.append(introducao)
    return "\n\n".join(partes) or _limpar_texto(item.get("title")) or "Questao ENEM"


def _alternativas(item: dict) -> list[Alternativa]:
    saida: list[Alternativa] = []
    correta = item.get("correctAlternative")
    for ordem, alternativa in enumerate(item.get("alternatives") or [], start=1):
        texto = _limpar_texto(alternativa.get("text"))
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


def _questoes_enem_existentes(sessao) -> dict[str, Questao]:
    questoes: dict[str, Questao] = {}
    existentes = sessao.scalars(
        select(Questao).where(Questao.competencias.cast(String).like("%enem:%"))
    )
    for questao in existentes:
        competencias = questao.competencias
        if not isinstance(competencias, list):
            continue
        for valor in competencias:
            if isinstance(valor, str) and valor.startswith("enem:"):
                questoes[valor] = questao
    return questoes


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


def _materia_normalizada(sessao, nome: str, cache: dict[str, Materia]) -> Materia:
    materia = cache.get(nome)
    if materia is None:
        materia = Materia(nome=nome)
        sessao.add(materia)
        sessao.flush()
        cache[nome] = materia
    return materia


def _conteudo_normalizado(
    sessao,
    materia: Materia,
    nome: str,
    cache: dict[tuple[int, str], Conteudo],
) -> Conteudo:
    conteudo = cache.get((materia.id, nome))
    if conteudo is None:
        conteudo = Conteudo(nome=nome, materia_id=materia.id)
        sessao.add(conteudo)
        sessao.flush()
        cache[(materia.id, nome)] = conteudo
    return conteudo


def _competencias(item: dict, origem: str, ano: int, area_label: str) -> list[str]:
    competencias = [origem, "ENEM", str(ano), area_label]
    if item.get("language"):
        competencias.append(f"idioma:{item['language']}")
    return competencias


def _aplicar_dados_enem(
    questao: Questao,
    *,
    item: dict,
    origem: str,
    ano: int,
    serie: Serie,
    nivel: Nivel,
    materia: Materia,
    conteudo: Conteudo,
    area_label: str,
    admin: Usuario | None,
) -> bool:
    mudou = False
    dados = {
        "enunciado": _enunciado(item),
        "imagem_url": _imagem_url(item),
        "serie_id": serie.id,
        "materia_id": materia.id,
        "conteudo_id": conteudo.id,
        "nivel_id": nivel.id,
        "status": StatusQuestao.PUBLICADA,
        "tempo_estimado_segundos": 180,
        "competencias": _competencias(item, origem, ano, area_label),
        "explicacao": (
            f"Fonte: ENEM {ano}, questao {item['index']}. "
            f"Area: {area_label}."
        ),
        "criado_por_id": admin.id if admin else questao.criado_por_id,
        "escola_id": None,
    }
    for campo, valor in dados.items():
        if getattr(questao, campo) != valor:
            setattr(questao, campo, valor)
            mudou = True

    alternativas_limpas = _alternativas(item)
    alternativas_atuais = sorted(questao.alternativas, key=lambda a: a.ordem_original)
    if len(alternativas_atuais) == len(alternativas_limpas):
        for atual, nova in zip(alternativas_atuais, alternativas_limpas):
            if atual.texto != nova.texto:
                atual.texto = nova.texto
                mudou = True
            if atual.correta != nova.correta:
                atual.correta = nova.correta
                mudou = True
            if atual.ordem_original != nova.ordem_original:
                atual.ordem_original = nova.ordem_original
                mudou = True

    return mudou


def importar(
    zip_path: Path,
    anos: set[int] | None,
    limite: int | None,
    dry_run: bool,
    batch_size: int,
    atualizar_existentes: bool,
) -> ResultadoImportacao:
    resultado = ResultadoImportacao()

    with zipfile.ZipFile(zip_path) as arquivo, SessionLocal() as sessao:
        nomes_zip = set(arquivo.namelist())
        serie = _get_or_create(sessao, Serie, SERIE_ENEM)
        nivel = _get_or_create(sessao, Nivel, NIVEL_ENEM)
        admin = _usuario_admin(sessao)
        existentes = _questoes_enem_existentes(sessao)
        materias_cache = _cache_materias(sessao)
        conteudos_cache = _cache_conteudos(sessao)

        exams = json.loads(arquivo.read(f"{ROOT_ZIP}/public/exams.json"))
        total_lidas = 0
        pendentes_no_lote = 0

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
                materia_nome, conteudo_nome, area_label = _materia_e_conteudo(
                    item.get("discipline") or "", item.get("language")
                )
                materia = _materia_normalizada(sessao, materia_nome, materias_cache)
                conteudo = _conteudo_normalizado(
                    sessao, materia, conteudo_nome, conteudos_cache
                )
                alternativas = _alternativas(item)
                if len(alternativas) < 2 or sum(1 for alt in alternativas if alt.correta) != 1:
                    resultado.rejeitadas += 1
                    total_lidas += 1
                    continue

                questao_existente = existentes.get(origem)
                if questao_existente is not None:
                    if atualizar_existentes and _aplicar_dados_enem(
                        questao_existente,
                        item=item,
                        origem=origem,
                        ano=ano,
                        serie=serie,
                        nivel=nivel,
                        materia=materia,
                        conteudo=conteudo,
                        area_label=area_label,
                        admin=admin,
                    ):
                        resultado.atualizadas += 1
                        pendentes_no_lote += 1
                    else:
                        resultado.ignoradas += 1
                    total_lidas += 1
                    if not dry_run and pendentes_no_lote >= max(1, batch_size):
                        sessao.commit()
                        pendentes_no_lote = 0
                    continue

                questao = Questao(
                    enunciado=_enunciado(item),
                    imagem_url=_imagem_url(item),
                    serie_id=serie.id,
                    materia_id=materia.id,
                    conteudo_id=conteudo.id,
                    nivel_id=nivel.id,
                    adaptacoes=[],
                    status=StatusQuestao.PUBLICADA,
                    tempo_estimado_segundos=180,
                    competencias=_competencias(item, origem, ano, area_label),
                    explicacao=(
                        f"Fonte: ENEM {ano}, questao {item['index']}. "
                        f"Area: {area_label}."
                    ),
                    criado_por_id=admin.id if admin else None,
                    escola_id=None,
                    alternativas=alternativas,
                )
                sessao.add(questao)
                existentes[origem] = questao
                resultado.importadas += 1
                pendentes_no_lote += 1
                total_lidas += 1

                if not dry_run and pendentes_no_lote >= max(1, batch_size):
                    sessao.commit()
                    pendentes_no_lote = 0

            if limite is not None and total_lidas >= limite:
                break

        if dry_run:
            sessao.rollback()
            return resultado

        if resultado.importadas or resultado.atualizadas:
            sessao.add(
                AcaoAuditoria(
                    tipo="importar_questoes",
                    usuario_id=admin.id if admin else None,
                    usuario_nome=admin.nome if admin else "Sistema",
                    alvo_tipo="questao",
                    detalhes=(
                        f"Importou acervo ENEM: {resultado.importadas} novas, "
                        f"{resultado.atualizadas} atualizadas, "
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
    resultado = importar(
        zip_path,
        anos,
        args.limite,
        args.dry_run,
        args.batch_size,
        args.atualizar_existentes,
    )
    modo = "dry-run" if args.dry_run else "gravado"
    print(f"Importacao ENEM ({modo})")
    print(f"  importadas: {resultado.importadas}")
    print(f"  atualizadas: {resultado.atualizadas}")
    print(f"  ignoradas: {resultado.ignoradas}")
    print(f"  rejeitadas: {resultado.rejeitadas}")


if __name__ == "__main__":
    main()
