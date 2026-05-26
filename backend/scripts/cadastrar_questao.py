import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Alternativa,
    Conteudo,
    Materia,
    Nivel,
    Questao,
    Serie,
)


def _escolher_fixo(sessao, modelo, rotulo: str):
    items = sessao.scalars(select(modelo).order_by(modelo.id)).all()
    if not items:
        raise RuntimeError(
            f"Nenhum(a) {rotulo} cadastrado(a). Rode: python scripts/seed_etiquetas.py"
        )
    print(f"\n{rotulo}s disponiveis:")
    for i, item in enumerate(items, start=1):
        print(f"  {i}. {item.nome}")
    while True:
        escolha = input(f"Escolha o numero da {rotulo.lower()}: ").strip()
        if escolha.isdigit() and 1 <= int(escolha) <= len(items):
            return items[int(escolha) - 1]
        print("  numero invalido, tente de novo.")


def _escolher_ou_criar_materia(sessao) -> Materia:
    materias = sessao.scalars(select(Materia).order_by(Materia.nome)).all()
    print("\nMaterias existentes:")
    if materias:
        for i, m in enumerate(materias, start=1):
            print(f"  {i}. {m.nome}")
    else:
        print("  (nenhuma ainda)")

    while True:
        entrada = input("Digite o numero OU um nome novo: ").strip()
        if not entrada:
            print("  materia eh obrigatoria.")
            continue
        if entrada.isdigit():
            idx = int(entrada)
            if materias and 1 <= idx <= len(materias):
                return materias[idx - 1]
            print("  numero invalido.")
            continue
        nova = Materia(nome=entrada)
        sessao.add(nova)
        sessao.flush()
        print(f"  -> nova materia criada (id={nova.id}).")
        return nova


def _escolher_ou_criar_conteudo(sessao, materia: Materia) -> Conteudo:
    conteudos = sessao.scalars(
        select(Conteudo)
        .where(Conteudo.materia_id == materia.id)
        .order_by(Conteudo.nome)
    ).all()
    print(f"\nConteudos de {materia.nome}:")
    if conteudos:
        for i, c in enumerate(conteudos, start=1):
            print(f"  {i}. {c.nome}")
    else:
        print("  (nenhum ainda)")

    while True:
        entrada = input("Digite o numero OU um nome novo: ").strip()
        if not entrada:
            print("  conteudo eh obrigatorio.")
            continue
        if entrada.isdigit():
            idx = int(entrada)
            if conteudos and 1 <= idx <= len(conteudos):
                return conteudos[idx - 1]
            print("  numero invalido.")
            continue
        novo = Conteudo(nome=entrada, materia=materia)
        sessao.add(novo)
        sessao.flush()
        print(f"  -> novo conteudo criado (id={novo.id}).")
        return novo


def _ler_alternativas() -> list[Alternativa]:
    while True:
        qtd_str = input("\nQuantas alternativas? (entre 2 e 5): ").strip()
        if qtd_str.isdigit() and 2 <= int(qtd_str) <= 5:
            qtd = int(qtd_str)
            break
        print("  digite um numero entre 2 e 5.")

    alts: list[Alternativa] = []
    correta_marcada = False
    for i in range(1, qtd + 1):
        texto = ""
        while not texto:
            texto = input(f"Alternativa {i} - texto: ").strip()
            if not texto:
                print("  texto nao pode ser vazio.")

        marca = False
        if not correta_marcada:
            marca = input("  eh a correta? (s/N): ").strip().lower() == "s"
            if marca:
                correta_marcada = True

        alts.append(Alternativa(texto=texto, correta=marca, ordem_original=i))

    if not correta_marcada:
        raise RuntimeError(
            "Nenhuma alternativa foi marcada como correta. Cadastro abortado."
        )
    return alts


def main() -> None:
    print("=== Cadastrar nova questao ===")
    with SessionLocal() as sessao:
        serie = _escolher_fixo(sessao, Serie, "Serie")
        materia = _escolher_ou_criar_materia(sessao)
        conteudo = _escolher_ou_criar_conteudo(sessao, materia)
        nivel = _escolher_fixo(sessao, Nivel, "Nivel")

        enunciado = ""
        while not enunciado:
            enunciado = input("\nEnunciado: ").strip()
            if not enunciado:
                print("  enunciado nao pode ser vazio.")

        imagem_url = input("URL da imagem (Enter para nenhuma): ").strip() or None

        adaptacoes_raw = input(
            "Adaptacoes separadas por virgula (Enter para nenhuma): "
        ).strip()
        adaptacoes = [a.strip() for a in adaptacoes_raw.split(",") if a.strip()]

        alternativas = _ler_alternativas()

        questao = Questao(
            enunciado=enunciado,
            imagem_url=imagem_url,
            serie=serie,
            materia=materia,
            conteudo=conteudo,
            nivel=nivel,
            adaptacoes=adaptacoes,
            alternativas=alternativas,
        )
        sessao.add(questao)
        sessao.commit()
        sessao.refresh(questao)

        print("\n=== Questao cadastrada ===")
        print(f"  ID:         {questao.id}")
        print(f"  Materia:    {questao.materia.nome}")
        print(f"  Conteudo:   {questao.conteudo.nome}")
        print(f"  Serie:      {questao.serie.nome}")
        print(f"  Nivel:      {questao.nivel.nome}")
        print(f"  Adaptacoes: {questao.adaptacoes}")
        print(f"  Enunciado:  {questao.enunciado}")
        print("  Alternativas:")
        for alt in questao.alternativas:
            marca = "  <- correta" if alt.correta else ""
            print(f"    {alt.ordem_original}. {alt.texto}{marca}")


if __name__ == "__main__":
    main()
