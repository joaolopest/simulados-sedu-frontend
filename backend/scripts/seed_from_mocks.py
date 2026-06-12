"""Popula o banco (Supabase) com os dados ricos exportados dos mocks do frontend.

Pre-requisito: rodar `npx tsx scripts/export-mocks.ts` na raiz do projeto, que
gera `backend/scripts/_mocks_export.json`.

Uso:
    python scripts/seed_from_mocks.py

O script LIMPA todas as tabelas de dados e reimporta do zero (idempotente).
Tambem recria 4 usuarios de acesso simples (admin@/gestor@/aluno@/suporte@
sedu.se.gov.br, senha sedu123) alem dos 216 usuarios do mock.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, text  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.enums import PerfilUsuario, VinculoAluno  # noqa: E402
from app.models import (  # noqa: E402
    Aluno,
    Alternativa,
    Conteudo,
    Escola,
    Materia,
    Nivel,
    Questao,
    Resposta,
    Serie,
    Simulado,
    SimuladoQuestao,
    Turma,
    Usuario,
)
from app.services import auth_service  # noqa: E402

ARQUIVO = Path(__file__).resolve().parent / "_mocks_export.json"

MAP_SERIE = {
    "1_fundamental": "1º ano",
    "2_fundamental": "2º ano",
    "3_fundamental": "3º ano",
    "4_fundamental": "4º ano",
    "5_fundamental": "5º ano",
    "6_fundamental": "6º ano",
    "7_fundamental": "7º ano",
    "8_fundamental": "8º ano",
    "9_fundamental": "9º ano",
    "1_medio": "1ª série EM",
    "2_medio": "2ª série EM",
    "3_medio": "3ª série EM",
}

MAP_MATERIA = {
    "portugues": "Português",
    "matematica": "Matemática",
    "ciencias": "Ciências",
    "historia": "História",
    "geografia": "Geografia",
    "ingles": "Inglês",
    "artes": "Artes",
    "educacao_fisica": "Educação Física",
    "fisica": "Física",
    "quimica": "Química",
    "biologia": "Biologia",
    "filosofia": "Filosofia",
    "sociologia": "Sociologia",
}

MAP_NIVEL = {"facil": "Fácil", "medio": "Médio", "dificil": "Difícil"}

MAP_PERFIL = {
    "admin": PerfilUsuario.ADMIN,
    "gestor": PerfilUsuario.GESTOR,
    "aluno": PerfilUsuario.ALUNO,
    "candidato": PerfilUsuario.CANDIDATO,
    "suporte": PerfilUsuario.SUPORTE,
}

TABELAS_PARA_LIMPAR = [
    "respostas", "simulado_questoes", "simulados",
    "registros_presenca", "folhas_presenca", "faltas", "agendamentos",
    "guias_estudo", "documentos_suporte", "contatos_responsaveis",
    "alternativas", "questoes", "assuntos_por_turma", "recursos_estudo",
    "assuntos_estudo", "avisos", "itens_calendario_letivo",
    "alunos", "turmas", "editais", "escolas",
    "conteudos", "usuarios", "niveis", "materias", "series",
]


def parse_dt(valor):
    if not valor:
        return None
    try:
        return datetime.fromisoformat(valor)
    except ValueError:
        return None


def main() -> None:
    dados = json.loads(ARQUIVO.read_text(encoding="utf-8"))
    senha_hash = auth_service.gerar_hash_senha("sedu123")

    with SessionLocal() as s:
        print("Limpando tabelas...")
        s.execute(
            text(
                "TRUNCATE TABLE "
                + ", ".join(TABELAS_PARA_LIMPAR)
                + " RESTART IDENTITY CASCADE"
            )
        )
        s.commit()

        # ---- caches get-or-create ----
        cache_serie: dict[str, Serie] = {}
        cache_materia: dict[str, Materia] = {}
        cache_nivel: dict[str, Nivel] = {}
        cache_conteudo: dict[tuple[str, int], Conteudo] = {}

        def get_serie(cod: str) -> Serie:
            nome = MAP_SERIE.get(cod, cod)
            if nome not in cache_serie:
                obj = s.scalar(select(Serie).where(Serie.nome == nome))
                if obj is None:
                    obj = Serie(nome=nome)
                    s.add(obj)
                    s.flush()
                cache_serie[nome] = obj
            return cache_serie[nome]

        def get_materia(cod: str) -> Materia:
            nome = MAP_MATERIA.get(cod, cod)
            if nome not in cache_materia:
                obj = s.scalar(select(Materia).where(Materia.nome == nome))
                if obj is None:
                    obj = Materia(nome=nome)
                    s.add(obj)
                    s.flush()
                cache_materia[nome] = obj
            return cache_materia[nome]

        def get_nivel(cod: str) -> Nivel:
            nome = MAP_NIVEL.get(cod, cod)
            if nome not in cache_nivel:
                obj = s.scalar(select(Nivel).where(Nivel.nome == nome))
                if obj is None:
                    obj = Nivel(nome=nome)
                    s.add(obj)
                    s.flush()
                cache_nivel[nome] = obj
            return cache_nivel[nome]

        def get_conteudo(nome: str, materia: Materia) -> Conteudo:
            chave = (nome, materia.id)
            if chave not in cache_conteudo:
                obj = Conteudo(nome=nome, materia_id=materia.id)
                s.add(obj)
                s.flush()
                cache_conteudo[chave] = obj
            return cache_conteudo[chave]

        # ---- escolas ----
        escola_map: dict[str, int] = {}
        for e in dados["escolas"]:
            obj = Escola(
                nome=e["nome"],
                municipio=e.get("municipio"),
                codigo_inep=e.get("codigoInep"),
            )
            s.add(obj)
            s.flush()
            escola_map[e["id"]] = obj.id
        print(f"Escolas: {len(escola_map)}")

        # ---- usuarios ----
        usuario_map: dict[str, int] = {}
        for u in dados["usuarios"]:
            obj = Usuario(
                nome=u["nome"],
                email=u["email"],
                senha_hash=senha_hash,
                perfil=MAP_PERFIL.get(u["perfil"], PerfilUsuario.ALUNO),
                ativo=u.get("ativo", True),
                criado_em=parse_dt(u.get("criadoEm")) or datetime.utcnow(),
            )
            s.add(obj)
            s.flush()
            # O mock tem IDs duplicados (usu_211..215 sao aluno E suporte).
            # Alunos vem antes na lista, e as turmas referenciam o aluno —
            # entao mantemos a primeira ocorrencia (aluno) no mapa de FKs.
            usuario_map.setdefault(u["id"], obj.id)
        print(f"Usuarios inseridos: {len(dados['usuarios'])} | IDs distintos: {len(usuario_map)}")

        # ---- turmas ----
        turma_map: dict[str, int] = {}
        aluno_para_turma: dict[str, str] = {}  # usuario_str -> turma_str
        for t in dados["turmas"]:
            obj = Turma(
                nome=t.get("nome"),
                escola_id=escola_map[t["escolaId"]],
                serie_id=get_serie(t["serie"]).id,
                ano_letivo=t.get("anoLetivo", 2026),
            )
            s.add(obj)
            s.flush()
            turma_map[t["id"]] = obj.id
            for aid in t.get("alunoIds", []):
                aluno_para_turma[aid] = t["id"]
        print(f"Turmas: {len(turma_map)}")

        # ---- alunos (so para usuarios perfil=aluno/candidato) ----
        n_alunos = 0
        alunos_refs: list[tuple[str, Aluno]] = []
        for u in dados["usuarios"]:
            if u["perfil"] not in ("aluno", "candidato"):
                continue
            turma_str = aluno_para_turma.get(u["id"]) or (
                u.get("turmaIds") or [None]
            )[0]
            turma_id = turma_map.get(turma_str) if turma_str else None
            obj = Aluno(
                usuario_id=usuario_map[u["id"]],
                vinculo=VinculoAluno.SUPLETIVO
                if u["perfil"] == "candidato"
                else VinculoAluno.ESCOLA,
                turma_id=turma_id,
                perfil_cognitivo=u.get("adaptacoes", []) or [],
                necessita_suporte=bool(u.get("adaptacoes")),
                avaliacao_suporte_pendente=False,
            )
            s.add(obj)
            alunos_refs.append((u["id"], obj))
            n_alunos += 1
        s.flush()
        aluno_map = {ustr: o.id for ustr, o in alunos_refs}
        print(f"Alunos: {n_alunos}")

        # ---- questoes + alternativas ----
        questao_map: dict[str, int] = {}
        # (questao_int, ordem) -> (alternativa_int, correta)  — usado pelos resultados
        alt_refs: list[tuple[int, int, bool, Alternativa]] = []
        for q in dados["questoes"]:
            materia = get_materia(q["materia"])
            obj = Questao(
                enunciado=q["enunciado"],
                imagem_url=q.get("imagemUrl"),
                serie_id=get_serie(q["serie"]).id,
                materia_id=materia.id,
                conteudo_id=get_conteudo(q["conteudo"], materia).id,
                nivel_id=get_nivel(q["nivel"]).id,
                adaptacoes=q.get("adaptacoes", []) or [],
                criada_em=parse_dt(q.get("criadoEm")) or datetime.utcnow(),
            )
            s.add(obj)
            s.flush()
            questao_map[q["id"]] = obj.id
            for i, alt in enumerate(q.get("alternativas", [])):
                ordem = alt.get("ordem", i)
                correta = alt.get("correta", False)
                alt_obj = Alternativa(
                    questao_id=obj.id,
                    texto=alt["texto"],
                    correta=correta,
                    ordem_original=ordem,
                )
                s.add(alt_obj)
                alt_refs.append((obj.id, ordem, correta, alt_obj))
        s.flush()
        alt_lookup = {
            (qid, ordem): (o.id, correta) for qid, ordem, correta, o in alt_refs
        }
        print(f"Questoes: {len(questao_map)} | Alternativas: {len(alt_refs)}")

        # ---- simulados + simulado_questoes ----
        simulado_map: dict[str, int] = {}
        n_sim = 0
        n_sq = 0
        for sim in dados["simulados"]:
            params = sim.get("parametros", {})
            turma_str = params.get("turmaId")
            turma_id = turma_map.get(turma_str)
            gestor_id = usuario_map.get(sim.get("criadoPor"))
            if turma_id is None or gestor_id is None:
                continue  # pula simulado com referencia faltando
            status_map = {
                "rascunho": "RASCUNHO",
                "em_curadoria": "GERADO",
                "liberado": "LIBERADO",
                "em_andamento": "LIBERADO",
                "finalizado": "FINALIZADO",
                "cancelado": "RASCUNHO",
            }
            obj = Simulado(
                gestor_id=gestor_id,
                turma_id=turma_id,
                titulo=params.get("nome", "Simulado"),
                parametros_json=params,
                status=status_map.get(sim.get("status"), "RASCUNHO"),
                criado_em=parse_dt(sim.get("criadoEm")) or datetime.utcnow(),
            )
            s.add(obj)
            s.flush()
            simulado_map[sim["id"]] = obj.id
            n_sim += 1
            for ordem, qid in enumerate(sim.get("questaoIds", [])):
                questao_id = questao_map.get(qid)
                if questao_id is None:
                    continue
                s.add(
                    SimuladoQuestao(
                        simulado_id=obj.id,
                        questao_id=questao_id,
                        ordem_questao=ordem,
                        alternativas_ordem=[],
                    )
                )
                n_sq += 1
        s.flush()
        print(f"Simulados: {n_sim} | SimuladoQuestoes: {n_sq}")

        # ---- resultados -> respostas dos alunos ----
        # A alternativa escolhida vem como "alt_que_XXX_<letra>"; a letra vira ordem.
        letra_para_ordem = {"a": 0, "b": 1, "c": 2, "d": 3, "e": 4}
        n_resp = 0
        n_pulados = 0
        vistos: set[tuple[int, int, int]] = set()  # (aluno, simulado, questao) unico
        for res in dados.get("resultados", []):
            aluno_id = aluno_map.get(res["alunoId"])
            simulado_id = simulado_map.get(res["simuladoId"])
            if aluno_id is None or simulado_id is None:
                continue
            for r in res.get("respostas", []):
                if r.get("status") != "respondida" or not r.get("alternativaId"):
                    continue  # em branco/sem alternativa: nao vira resposta
                questao_id = questao_map.get(r["questaoId"])
                if questao_id is None:
                    continue
                letra = r["alternativaId"].rsplit("_", 1)[-1]
                ordem = letra_para_ordem.get(letra)
                alt = alt_lookup.get((questao_id, ordem))
                if alt is None:
                    n_pulados += 1
                    continue
                alternativa_id, correta = alt
                chave = (aluno_id, simulado_id, questao_id)
                if chave in vistos:
                    continue  # respeita a constraint uq_resposta_unica
                vistos.add(chave)
                s.add(
                    Resposta(
                        aluno_id=aluno_id,
                        simulado_id=simulado_id,
                        questao_id=questao_id,
                        alternativa_id=alternativa_id,
                        correta=correta,
                        respondida_em=parse_dt(r.get("respondidaEm"))
                        or datetime.utcnow(),
                    )
                )
                n_resp += 1
        s.flush()
        print(f"Respostas: {n_resp} (puladas sem alternativa: {n_pulados})")

        # ---- 4 usuarios de acesso simples ----
        extras = [
            ("Administrador SEDU", "admin@sedu.se.gov.br", PerfilUsuario.ADMIN),
            ("Gestor Demo", "gestor@sedu.se.gov.br", PerfilUsuario.GESTOR),
            ("Aluno Demo", "aluno@sedu.se.gov.br", PerfilUsuario.ALUNO),
            ("Suporte Demo", "suporte@sedu.se.gov.br", PerfilUsuario.SUPORTE),
        ]
        for nome, email, perfil in extras:
            existe = s.scalar(select(Usuario).where(Usuario.email == email))
            if existe is None:
                s.add(
                    Usuario(
                        nome=nome,
                        email=email,
                        senha_hash=senha_hash,
                        perfil=perfil,
                        ativo=True,
                    )
                )
        s.commit()
        print("Usuarios de acesso simples: 4 (senha: sedu123)")

        print("\n=== IMPORTACAO CONCLUIDA ===")


if __name__ == "__main__":
    main()
