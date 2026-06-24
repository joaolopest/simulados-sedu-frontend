import jwt


def test_login_valido_retorna_token(client):
    r = client.post("/auth/login", json={"email": "gestor@x.gov.br", "senha": "sedu123"})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["usuario"]["perfil"] == "gestor"
    assert corpo["token"]


def test_login_senha_errada_e_recusado(client):
    r = client.post("/auth/login", json={"email": "gestor@x.gov.br", "senha": "errada"})
    assert r.status_code == 403
    assert r.json()["codigo"] == "credenciais_invalidas"


def test_me_exige_token(client):
    assert client.get("/auth/me").status_code in (401, 403)


def test_me_com_token_retorna_usuario(client, h_gestor):
    r = client.get("/auth/me", headers=h_gestor)
    assert r.status_code == 200
    assert r.json()["email"] == "gestor@x.gov.br"


def test_token_forjado_e_rejeitado(client):
    falso = jwt.encode({"sub": "1", "perfil": "admin"}, "chave-do-atacante", algorithm="HS256")
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {falso}"})
    assert r.status_code == 403
