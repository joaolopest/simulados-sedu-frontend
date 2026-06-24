import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from app.api.main import app  # noqa: E402

c = TestClient(app)
ok = []


def checa(nome, cond):
    ok.append(cond)
    print(("  OK  " if cond else " FALHA ") + nome)


def login(email, senha="sedu123"):
    r = c.post("/auth/login", json={"email": email, "senha": senha})
    return r.json().get("token") if r.status_code == 200 else None


print("== Autenticação e autorização ==")
checa("anônimo em GET /questoes é barrado", c.get("/questoes").status_code in (401, 403))
checa("anônimo em POST /provas/gerar é barrado", c.post("/provas/gerar", json={"serie": "9º ano"}).status_code in (401, 403))
checa("login com senha errada falha", c.post("/auth/login", json={"email": "gestor@sedu.se.gov.br", "senha": "errada"}).status_code == 403)

tok_gestor = login("gestor@sedu.se.gov.br")
tok_aluno = login("aluno@sedu.se.gov.br")
checa("login do gestor retorna token", bool(tok_gestor))
checa("login do aluno retorna token", bool(tok_aluno))

hg = {"Authorization": f"Bearer {tok_gestor}"}
ha = {"Authorization": f"Bearer {tok_aluno}"}

checa("token forjado é rejeitado em /auth/me", c.get("/auth/me", headers={"Authorization": "Bearer abc.def.ghi"}).status_code == 403)
checa("aluno NÃO lista questões (gabarito) → 403", c.get("/questoes", headers=ha).status_code == 403)
checa("gestor lista questões (paginado)", "meta" in c.get("/questoes", headers=hg).json())

print("== Ciclo de simulado ==")
turmas = c.get("/turmas", headers=hg).json()
turma_id = turmas[0]["id"]
criar = c.post("/simulados", headers=hg, json={
    "turma_id": turma_id, "titulo": "Smoke", "serie": "9º ano", "materia": "Matemática",
    "quantidade": 5, "distribuicao": {"Fácil": 0.3, "Médio": 0.5, "Difícil": 0.2}, "seed": 7,
})
checa("gestor cria simulado (201)", criar.status_code == 201)
sid = criar.json()["id"]
checa("gestor_id veio do token (não do corpo)", criar.json()["gestor_id"] is not None)

g = c.post(f"/simulados/{sid}/gerar", headers=hg, json={})
checa("gerar → status 'gerado'", g.json().get("status") == "gerado")
checa("liberar antes seria barrado? liberar agora ok", c.post(f"/simulados/{sid}/liberar", headers=hg, json={}).json().get("status") == "liberado")

qa = c.get(f"/simulados/{sid}/questoes", headers=ha).json()["questoes"]
checa("aluno vê questões SEM gabarito", all("gabarito" not in q for q in qa))

# aluno responde (identidade vem do token; não há aluno_id no corpo)
for q in qa:
    c.post("/respostas", headers=ha, json={
        "simulado_id": sid, "questao_id": q["questao_id"],
        "alternativa_id": q["alternativas"][0]["alternativa_id"],
    })
checa("gestor NÃO pode responder (não é aluno) → 403", c.post("/respostas", headers=hg, json={
    "simulado_id": sid, "questao_id": qa[0]["questao_id"],
    "alternativa_id": qa[0]["alternativas"][0]["alternativa_id"]}).status_code == 403)

fim = c.post(f"/simulados/{sid}/finalizar", headers=hg, json={}).json()
checa("finalizar calcula nota do aluno", len(fim.get("resultados", [])) == 1)
print(f"    nota: {fim['resultados'][0]['nota']} ({fim['resultados'][0]['acertos']}/{fim['resultados'][0]['total_questoes']})")

print("== Validações de borda ==")
seis = c.post("/questoes", headers=hg, json={
    "enunciado": "x?", "serie": "9º ano", "materia": "Matemática", "conteudo": "Teste", "nivel": "Fácil",
    "alternativas": [{"texto": str(i), "correta": i == 0} for i in range(6)]})
checa("cadastro com 6 alternativas é rejeitado (422)", seis.status_code == 422)
dist = c.post("/provas/gerar", headers=hg, json={"serie": "9º ano", "materia": "Matemática", "distribuicao": {"Fácil": 0.5, "Médio": 0.2, "Difícil": 0.1}})
checa("distribuição que não soma 1 é rejeitada (422)", dist.status_code == 422)

print()
print(f"RESUMO: {sum(ok)}/{len(ok)} verificações passaram")
sys.exit(0 if all(ok) else 1)
