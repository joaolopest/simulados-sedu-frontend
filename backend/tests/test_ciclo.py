def _cria_e_gera(client, h_gestor, turma_id, quantidade=5):
    criar = client.post(
        "/simulados",
        headers=h_gestor,
        json={
            "turma_id": turma_id,
            "titulo": "Simulado Teste",
            "serie": "9º ano",
            "materia": "Matemática",
            "quantidade": quantidade,
            "distribuicao": {"Fácil": 0.4, "Médio": 0.4, "Difícil": 0.2},
            "seed": 7,
        },
    )
    assert criar.status_code == 201, criar.text
    sid = criar.json()["id"]
    assert client.post(f"/simulados/{sid}/gerar", headers=h_gestor, json={}).json()["status"] == "gerado"
    return sid


def test_gestor_id_vem_do_token(client, h_gestor, dados):
    criar = client.post(
        "/simulados",
        headers=h_gestor,
        json={"turma_id": dados["turma_id"], "titulo": "x", "serie": "9º ano", "materia": "Matemática"},
    )
    assert criar.json()["gestor_id"] == dados["gestor_id"]


def test_ciclo_completo_calcula_nota_dez(client, h_gestor, h_aluno, dados):
    sid = _cria_e_gera(client, h_gestor, dados["turma_id"], quantidade=5)
    client.post(f"/simulados/{sid}/liberar", headers=h_gestor, json={})

    preview = client.get(f"/simulados/{sid}/preview", headers=h_gestor).json()["questoes"]
    for q in preview:
        correta = next(a for a in q["alternativas"] if a["correta"])
        r = client.post(
            "/respostas",
            headers=h_aluno,
            json={"simulado_id": sid, "questao_id": q["questao_id"], "alternativa_id": correta["alternativa_id"]},
        )
        assert r.status_code == 200, r.text

    fim = client.post(f"/simulados/{sid}/finalizar", headers=h_gestor, json={}).json()
    assert fim["alunos_avaliados"] == 1
    assert fim["resultados"][0]["nota"] == 10.0


def test_aluno_so_responde_como_si_mesmo(client, h_gestor, h_aluno, h_aluno2, dados):
    # Sem aluno_id no corpo: cada token gera resposta atribuída ao seu próprio aluno.
    sid = _cria_e_gera(client, h_gestor, dados["turma_id"], quantidade=3)
    client.post(f"/simulados/{sid}/liberar", headers=h_gestor, json={})
    qa = client.get(f"/simulados/{sid}/questoes", headers=h_aluno).json()["questoes"]
    alvo = qa[0]
    for h in (h_aluno, h_aluno2):
        r = client.post(
            "/respostas",
            headers=h,
            json={"simulado_id": sid, "questao_id": alvo["questao_id"], "alternativa_id": alvo["alternativas"][0]["alternativa_id"]},
        )
        assert r.status_code == 200
    fim = client.post(f"/simulados/{sid}/finalizar", headers=h_gestor, json={}).json()
    assert fim["alunos_avaliados"] == 2  # dois alunos distintos, derivados do token


def test_gestor_nao_responde(client, h_gestor, dados):
    sid = _cria_e_gera(client, h_gestor, dados["turma_id"], quantidade=3)
    client.post(f"/simulados/{sid}/liberar", headers=h_gestor, json={})
    qa = client.get(f"/simulados/{sid}/questoes", headers=h_gestor).json()["questoes"]
    r = client.post(
        "/respostas",
        headers=h_gestor,
        json={"simulado_id": sid, "questao_id": qa[0]["questao_id"], "alternativa_id": qa[0]["alternativas"][0]["alternativa_id"]},
    )
    assert r.status_code == 403


def test_gestor_edita_simulado_trocar_e_remover(client, h_gestor, dados):
    sid = _cria_e_gera(client, h_gestor, dados["turma_id"], quantidade=3)
    prev = client.get(f"/simulados/{sid}/preview", headers=h_gestor).json()["questoes"]
    qid = prev[0]["questao_id"]

    trocado = client.post(f"/simulados/{sid}/questoes/{qid}/trocar", headers=h_gestor)
    assert trocado.status_code == 200
    assert len(trocado.json()["questoes"]) == 3

    qid2 = trocado.json()["questoes"][0]["questao_id"]
    removido = client.delete(f"/simulados/{sid}/questoes/{qid2}", headers=h_gestor)
    assert removido.status_code == 200
    assert len(removido.json()["questoes"]) == 2


def test_aluno_ve_questoes_sem_gabarito(client, h_gestor, h_aluno, dados):
    sid = _cria_e_gera(client, h_gestor, dados["turma_id"], quantidade=3)
    client.post(f"/simulados/{sid}/liberar", headers=h_gestor, json={})
    qa = client.get(f"/simulados/{sid}/questoes", headers=h_aluno).json()["questoes"]
    assert all("gabarito" not in q for q in qa)
    assert all("correta" not in a for q in qa for a in q["alternativas"])
