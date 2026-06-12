# SEDU Simulados — Backend (API do Banco de Questões)

Backend do Sistema de Simulados Educacionais (SEDU-ES). Projeto da residência
em software.

## Stack

- Python 3.12 (no Docker) / 3.x local
- FastAPI + SQLAlchemy 2.x
- PostgreSQL (Supabase em produção, Postgres local no Docker)

---

## Como rodar — 3 formas

### Forma 1 — Docker (recomendada, "clone e roda")

Sobe a **aplicação inteira** (frontend + backend + Postgres + dados) com um
comando. **Não precisa de `.env` nem senha.** Os dados (220 usuários, 60
questões, etc.) são populados automaticamente.

```bash
# na raiz do projeto (onde está o docker-compose.yml)
docker compose up --build
```

Pronto:
- **Frontend** em http://localhost:3000
- **Backend** em http://localhost:8000 (Swagger em /docs)
- **Postgres local** na porta 5432 (usuário/senha: `postgres`/`postgres`)

Qual banco o backend usa:
- **Sem `.env` na raiz** → Postgres **local** do compose (padrão, já com dados)
- **Com `.env` na raiz** com `DATABASE_URL=<supabase>` → usa o **Supabase**

Comandos úteis:
- Parar (mantém os dados): `docker compose down`
- Zerar tudo (apaga o banco local): `docker compose down -v`
- Subir de novo (rápido): `docker compose up`
- Ver logs: `docker compose logs -f backend`

### Forma 2 — Supabase (banco compartilhado, em nuvem)

Use quando quiser que o time veja **os mesmos dados** ou for fazer deploy.
Precisa da connection string (peça pra quem administra — vem por canal seguro,
nunca pelo git).

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# copie .env.example para .env e cole a connection string do Supabase
copy .env.example .env
# edite .env e troque [SUA_SENHA] pela senha do banco

python -m uvicorn app.api.main:app --reload
```

### Forma 3 — SQLite local (sem nada compartilhado, offline)

Sem `.env`, o backend usa um SQLite local (`seduc_questoes.db`).

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\init_db.py            # cria tabelas
python scripts\seed_from_mocks.py    # popula com os dados dos mocks
python -m uvicorn app.api.main:app --reload
```

---

## Acesso (usuários de teste)

Todos com senha **`sedu123`**. Um de cada perfil:

| Email | Perfil | Acessa |
|---|---|---|
| admin@sedu.se.gov.br | admin | tudo |
| gestor@sedu.se.gov.br | gestor | simulados, etapas, avisos, ver questões |
| suporte@sedu.se.gov.br | suporte | ver alunos/questões, avisos |
| aluno@sedu.se.gov.br | aluno | só os próprios dados |

Também dá pra logar com os 216 usuários do mock (ex.: `renata.cardoso@sedu.es.gov.br`).

## Permissões (RBAC)

Cada rota exige token JWT + perfil adequado:
- Sem token → **401**
- Perfil errado → **403**
- Aluno tentando ver dados de outro aluno → **403** (checagem de dono)

## Repopular os dados

```bash
# 1. na raiz: exporta os mocks do frontend para JSON
npx tsx scripts/export-mocks.ts
# 2. em backend/: importa pro banco configurado (Supabase ou local)
python scripts/seed_from_mocks.py
```

## Estrutura

```
backend/
├── Dockerfile              # imagem do backend (Python 3.12)
├── docker-entrypoint.py    # espera DB, cria tabelas, popula, sobe a API
├── .env.example            # modelo de configuração (copie para .env)
├── app/
│   ├── database.py         # engine/sessão — lê DATABASE_URL do .env
│   ├── enums.py            # perfis, status, etc.
│   ├── models.py           # 27 tabelas ORM
│   └── api/
│       ├── main.py         # registra os routers
│       ├── permissoes.py   # RBAC (exigir_perfil, exigir_dono_aluno)
│       └── routers/        # auth, estrutura, etapas, aluno, questoes, ...
└── scripts/
    ├── init_db.py          # cria as tabelas
    ├── seed_from_mocks.py  # popula com os dados do frontend
    └── verificar_banco.py  # testa conexão e lista tabelas
```

> `docker-compose.yml` fica na **raiz** do projeto (não em `backend/`).
