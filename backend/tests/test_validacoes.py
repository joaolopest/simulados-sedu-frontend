def test_cadastro_seis_alternativas_rejeitado(client, h_gestor):
    r = client.post(
        "/questoes",
        headers=h_gestor,
        json={
            "enunciado": "x?",
            "serie": "9º ano",
            "materia": "Matemática",
            "conteudo": "Teste",
            "nivel": "Fácil",
            "alternativas": [{"texto": str(i), "correta": i == 0} for i in range(6)],
        },
    )
    assert r.status_code == 422
    assert r.json()["codigo"] == "dados_invalidos"


def test_cadastro_sem_correta_rejeitado(client, h_gestor):
    r = client.post(
        "/questoes",
        headers=h_gestor,
        json={
            "enunciado": "x?",
            "serie": "9º ano",
            "materia": "Matemática",
            "conteudo": "Teste",
            "nivel": "Fácil",
            "alternativas": [{"texto": "a", "correta": False}, {"texto": "b", "correta": False}],
        },
    )
    assert r.status_code == 422


def test_cadastro_valido_retorna_201(client, h_gestor):
    r = client.post(
        "/questoes",
        headers=h_gestor,
        json={
            "enunciado": "2+2?",
            "serie": "9º ano",
            "materia": "Matemática",
            "conteudo": "Soma",
            "nivel": "Fácil",
            "alternativas": [{"texto": "4", "correta": True}, {"texto": "5", "correta": False}],
        },
    )
    assert r.status_code == 201
    assert r.json()["id"]


def test_distribuicao_que_nao_soma_um_rejeitada(client, h_gestor):
    r = client.post(
        "/provas/gerar",
        headers=h_gestor,
        json={"serie": "9º ano", "materia": "Matemática", "distribuicao": {"Fácil": 0.5, "Médio": 0.2, "Difícil": 0.1}},
    )
    assert r.status_code == 422


def test_gerar_prova_traz_parametros_e_gabarito(client, h_gestor):
    r = client.post(
        "/provas/gerar",
        headers=h_gestor,
        json={"serie": "9º ano", "materia": "Matemática", "quantidade": 4, "seed": 1},
    )
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["parametros"]["quantidade"] == 4
    assert len(corpo["gabarito"]) == corpo["total"]


def test_liberar_antes_de_gerar_falha(client, h_gestor, dados):
    criar = client.post(
        "/simulados",
        headers=h_gestor,
        json={"turma_id": dados["turma_id"], "titulo": "x", "serie": "9º ano", "materia": "Matemática"},
    )
    sid = criar.json()["id"]
    r = client.post(f"/simulados/{sid}/liberar", headers=h_gestor, json={})
    assert r.status_code == 409


def test_finalizar_nao_liberado_falha(client, h_gestor, dados):
    criar = client.post(
        "/simulados",
        headers=h_gestor,
        json={"turma_id": dados["turma_id"], "titulo": "x", "serie": "9º ano", "materia": "Matemática", "quantidade": 3},
    )
    sid = criar.json()["id"]
    client.post(f"/simulados/{sid}/gerar", headers=h_gestor, json={})
    r = client.post(f"/simulados/{sid}/finalizar", headers=h_gestor, json={})
    assert r.status_code == 409


def test_importacao_relatorio_de_erros(client, h_gestor):
    payload = {
        "questoes": [
            {
                "enunciado": "ok?",
                "etiquetas": {"serie": "9º ano", "materia": "Matemática", "conteudo": "Teste", "nivel": "Fácil"},
                "alternativas": [{"texto": "2", "correta": True}, {"texto": "3", "correta": False}],
            },
            {
                "enunciado": "sem correta",
                "etiquetas": {"serie": "9º ano", "materia": "Matemática", "conteudo": "Teste", "nivel": "Fácil"},
                "alternativas": [{"texto": "2", "correta": False}, {"texto": "3", "correta": False}],
            },
        ]
    }
    r = client.post("/questoes/import", headers=h_gestor, json=payload)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["importadas"] == 1
    assert corpo["rejeitadas"] == 1
    assert corpo["erros"][0]["linha"] == 2
