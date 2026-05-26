import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.enums import PerfilUsuario  # noqa: E402
from app.models import Aluno, Escola, Serie, Turma, Usuario  # noqa: E402
from app.services import simulado_service  # noqa: E402


def _obter_ou_criar_usuario(sessao, email, nome, perfil) -> Usuario:
    u = sessao.scalar(select(Usuario).where(Usuario.email == email))
    if u is None:
        u = Usuario(nome=nome, email=email, senha_hash="placeholder", perfil=perfil)
        sessao.add(u)
        sessao.flush()
    return u


def _preparar_estrutura() -> tuple[int, int, int]:
    with SessionLocal() as sessao:
        serie = sessao.scalar(select(Serie).where(Serie.nome == "9º ano"))
        if serie is None:
            raise RuntimeError("Rode os seeds antes (seed_etiquetas / seed_questoes_demo).")

        escola = sessao.scalar(select(Escola).where(Escola.nome == "Escola Estadual Demo"))
        if escola is None:
            escola = Escola(nome="Escola Estadual Demo", municipio="Aracaju", codigo_inep="28000001")
            sessao.add(escola)
            sessao.flush()

        turma = sessao.scalar(
            select(Turma).where(Turma.escola_id == escola.id, Turma.nome == "9A")
        )
        if turma is None:
            turma = Turma(escola=escola, serie=serie, ano_letivo=2026, nome="9A")
            sessao.add(turma)
            sessao.flush()

        gestor = _obter_ou_criar_usuario(
            sessao, "gestor@demo.se.gov.br", "Maria Gestora", PerfilUsuario.GESTOR
        )
        usuario_aluno = _obter_ou_criar_usuario(
            sessao, "aluno@demo.se.gov.br", "Joao Aluno", PerfilUsuario.ALUNO
        )
        aluno = sessao.scalar(select(Aluno).where(Aluno.usuario_id == usuario_aluno.id))
        if aluno is None:
            aluno = Aluno(usuario=usuario_aluno, turma=turma, perfil_cognitivo=[])
            sessao.add(aluno)
            sessao.flush()

        sessao.commit()
        return gestor.id, turma.id, aluno.id


def main() -> None:
    gestor_id, turma_id, aluno_id = _preparar_estrutura()
    print(f"Estrutura: gestor_id={gestor_id}, turma_id={turma_id}, aluno_id={aluno_id}")

    with SessionLocal() as sessao:
        simulado = simulado_service.criar_simulado(
            sessao,
            gestor_id=gestor_id,
            turma_id=turma_id,
            titulo="Simulado Demo - 9o ano",
            parametros={
                "serie": "9º ano",
                "materia": "Matemática",
                "distribuicao": {"Fácil": 0.3, "Médio": 0.5, "Difícil": 0.2},
                "quantidade": 5,
                "seed": 7,
            },
        )
        simulado_id = simulado.id
        print(f"1) Criado     -> id={simulado_id}, status={simulado.status.value}")

    with SessionLocal() as sessao:
        simulado = simulado_service.gerar_e_persistir(sessao, simulado_id=simulado_id)
        print(f"2) Gerado     -> {len(simulado.questoes)} questoes, status={simulado.status.value}")

    with SessionLocal() as sessao:
        simulado = simulado_service.liberar(sessao, simulado_id=simulado_id)
        print(f"3) Liberado   -> status={simulado.status.value}")

    with SessionLocal() as sessao:
        questoes = simulado_service.montar_questoes(
            sessao, simulado_id=simulado_id, incluir_gabarito=True
        )
    with SessionLocal() as sessao:
        for i, q in enumerate(questoes):
            if i < 3:
                escolha = next(a for a in q["alternativas"] if a["correta"])
            else:
                escolha = next(a for a in q["alternativas"] if not a["correta"])
            simulado_service.registrar_resposta(
                sessao,
                aluno_id=aluno_id,
                simulado_id=simulado_id,
                questao_id=q["questao_id"],
                alternativa_id=escolha["alternativa_id"],
            )
        print(f"4) Respondido -> {len(questoes)} questoes (3 corretas de proposito)")

    with SessionLocal() as sessao:
        resultado = simulado_service.finalizar_e_corrigir(sessao, simulado_id=simulado_id)
        print("5) Corrigido  ->")
        for r in resultado["resultados"]:
            print(
                f"     aluno {r['aluno_id']}: {r['acertos']}/{r['total_questoes']} "
                f"acertos  ->  nota {r['nota']}"
            )


if __name__ == "__main__":
    main()
