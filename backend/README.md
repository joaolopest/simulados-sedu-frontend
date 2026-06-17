# SEDU Simulados - Backend

API FastAPI da plataforma de simulados. O banco principal é Supabase/Postgres; o Postgres local via Docker é fallback e backup.

## Stack

- Python 3.12
- FastAPI + SQLAlchemy 2.x
- PostgreSQL
- Supabase como banco principal
- Docker Compose para fallback local

## Banco

A aplicação usa apenas PostgreSQL em runtime, seja Supabase ou Docker local.

Ordem de conexão:

1. `DATABASE_URL` em `backend/.env` ou `.env` da raiz aponta para Supabase.
2. Se não houver `.env` ou a conexão falhar, use o script da raiz para subir o Postgres local Docker.
3. Migrações idempotentes rodam antes do seed.
4. `scripts/seed_demo.py` completa lacunas sem apagar dados existentes.

## Como rodar

### Automático com fallback

Na raiz do projeto:

```powershell
.\scripts\start-app.ps1
```

Esse script:

- lê `.env` e `backend\.env`;
- testa o Supabase;
- mantém o banco Docker parado quando Supabase está disponível;
- sobe o Postgres local Docker quando o Supabase não responde;
- inicia backend e frontend.

### Backend manual

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\init_db.py
python scripts\seed_demo.py
python -m uvicorn app.api.main:app --reload
```

### Banco local explícito

Na raiz:

```powershell
docker compose --profile local-db up -d db
```

Use:

```powershell
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/seduc"
```

## Backup Supabase -> Docker Local

Na raiz:

```powershell
.\scripts\sync-supabase-to-local.ps1 -Yes
```

O sync copia Supabase para o Postgres local. Ele pode sobrescrever o backup local, mas não apaga o Supabase.

## Acesso de Demonstração

Todos usam senha `sedu123`.

| Email | Perfil |
| --- | --- |
| admin@sedu.se.gov.br | admin |
| gestor@sedu.se.gov.br | gestor |
| professor@sedu.se.gov.br | professor |
| roberto.nogueira@sedu.es.gov.br | suporte |
| aluno@sedu.se.gov.br | aluno |
| candidato@sedu.se.gov.br | candidato |

## Permissões

- Admin: acesso total, auditoria, revisões e gestão global.
- Gestor: turmas, provas, questões e suporte dentro da própria escola.
- Professor: cria provas, cria questões, edita próprias questões e solicita revisão para questões de outros.
- Suporte: vê alunos com necessidade de suporte da própria escola e registra acompanhamento.
- Aluno/candidato: acessam apenas os próprios dados e resultados.

O backend é a fonte de autorização. O frontend apenas esconde ou desabilita opções.

## Scripts

```text
backend/scripts/init_db.py      cria tabelas e aplica migrações idempotentes
backend/scripts/seed_demo.py    completa dados persistentes mínimos
backend/scripts/reset_db.py     reseta banco local/dev e roda seed
scripts/start-app.ps1           inicia app com fallback Supabase -> Docker
scripts/sync-supabase-to-local.ps1  copia Supabase para backup local
```
