def test_anonimo_barrado_em_questoes(client):
    assert client.get("/questoes").status_code in (401, 403)


def test_anonimo_barrado_em_gerar_prova(client):
    assert client.post("/provas/gerar", json={"serie": "9º ano"}).status_code in (401, 403)


def test_aluno_nao_lista_questoes_com_gabarito(client, h_aluno):
    # GET /questoes expõe o campo 'correta' — restrito a gestor/admin
    assert client.get("/questoes", headers=h_aluno).status_code == 403


def test_aluno_nao_cria_simulado(client, h_aluno, dados):
    r = client.post(
        "/simulados",
        headers=h_aluno,
        json={"turma_id": dados["turma_id"], "titulo": "x", "serie": "9º ano", "materia": "Matemática"},
    )
    assert r.status_code == 403


def test_gestor_lista_questoes_paginado(client, h_gestor):
    r = client.get("/questoes", headers=h_gestor)
    assert r.status_code == 200
    corpo = r.json()
    assert "dados" in corpo and "meta" in corpo
    assert corpo["meta"]["total"] == 6
