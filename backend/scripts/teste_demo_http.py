import json
import urllib.request

BASE = "http://127.0.0.1:8000"


def _post(path: str, obj: dict | None = None) -> dict:
    data = json.dumps(obj or {}).encode("utf-8")
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def _get(path: str) -> dict:
    with urllib.request.urlopen(BASE + path) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> None:
    ids = _post("/demo/preparar")
    print(f"1) Estrutura: gestor={ids['gestor_id']} turma={ids['turma_id']} "
          f"aluno={ids['aluno_id']} serie={ids['serie']}")

    sim = _post("/simulados", {
        "gestor_id": ids["gestor_id"], "turma_id": ids["turma_id"],
        "titulo": "Demo HTTP", "serie": ids["serie"], "materia": "Matemática",
        "quantidade": 4, "distribuicao": {"Fácil": 0.3, "Médio": 0.5, "Difícil": 0.2},
    })
    print(f"2) Criar:    #{sim['id']} status={sim['status']}")

    g = _post(f"/simulados/{sim['id']}/gerar")
    print(f"3) Gerar:    status={g['status']} questoes={g['total_questoes']}")

    lib = _post(f"/simulados/{sim['id']}/liberar")
    print(f"4) Liberar:  status={lib['status']}")

    qa = _get(f"/simulados/{sim['id']}/questoes")
    print(f"5) Aluno ve: {len(qa['questoes'])} questoes (sem gabarito)")

    for q in qa["questoes"]:
        _post("/respostas", {
            "aluno_id": ids["aluno_id"], "simulado_id": sim["id"],
            "questao_id": q["questao_id"],
            "alternativa_id": q["alternativas"][0]["alternativa_id"],
        })
    print("6) Respondido (1a alternativa de cada)")

    r = _post(f"/simulados/{sim['id']}/finalizar")
    for res in r["resultados"]:
        print(f"7) Corrigido: nota {res['nota']} "
              f"({res['acertos']}/{res['total_questoes']} acertos)")


if __name__ == "__main__":
    main()
