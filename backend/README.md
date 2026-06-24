# SEDUC Simulados — Backend

Backend do **Sistema de Simulados Educacionais com IA** da Secretaria de Educação de Sergipe (SEDUC-SE). Projeto da Residência em Software (UNIT / ADS).

Banco de questões etiquetadas, geração de provas balanceadas, ciclo de simulado (criação → geração → liberação → resposta do aluno → correção) e autenticação JWT por perfil.

## Stack

- **Python 3.11+**, **FastAPI**, **SQLAlchemy 2.x**
- **SQLite** no desenvolvimento → **PostgreSQL** em produção (troca por variável de ambiente)
- **JWT** (PyJWT) com hash de senha PBKDF2
- **Alembic** para migrações · **pytest** para testes

## Arquitetura em camadas

```
HTTP  →  app/api/routers/      (FastAPI: validação, autorização)
         app/services/         (regra de negócio)
         app/repositories/     (acesso a dados — SQLAlchemy)
         app/models.py         (ORM)  ·  app/database.py (engine/sessão)
```

Camadas de apoio: `app/config.py` (configuração por ambiente), `app/exceptions.py` (erros de domínio → respostas HTTP padronizadas `{codigo, mensagem}`), `app/enums.py`.

## Como rodar (desenvolvimento)

```powershell
# 1. Ambiente virtual + dependências
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

# 2. Configuração: copie .env.example para .env e gere um segredo
#    python -c "import secrets; print(secrets.token_urlsafe(48))"
copy .env.example .env   # ajuste SEDU_JWT_SECRET

# 3. Criar o schema (Alembic é a fonte de verdade)
alembic upgrade head

# 4. Popular dados
python scripts\seed_etiquetas.py
python scripts\seed_demo.py            # usuários admin/gestor/aluno + escola/turma
python scripts\seed_questoes_demo.py
python scripts\seed_questoes_extra.py

# 5. Subir a API
uvicorn app.api.main:app --reload
```

- **Documentação interativa (Swagger):** http://127.0.0.1:8000/docs
- **Página de demonstração:** http://127.0.0.1:8000/ (habilitada por `SEDU_DEMO_HABILITADO`)

## Autenticação

Todos os endpoints (exceto `/auth/login` e `/health`) exigem token JWT no header `Authorization: Bearer <token>`.

```
POST /auth/login  { "email": "...", "senha": "..." }  → { token, usuario }
```

Usuários de demonstração (senha `sedu123`): `admin@sedu.se.gov.br`, `gestor@sedu.se.gov.br`, `aluno@sedu.se.gov.br`.

Autorização por perfil: escrita do banco de questões, geração e administração de simulados exigem **gestor/admin**; responder simulado exige **aluno** (identidade derivada do token, nunca do corpo da requisição).

## Configuração (variáveis de ambiente, prefixo `SEDU_`)

| Variável | Padrão | Descrição |
|---|---|---|
| `SEDU_AMBIENTE` | `desenvolvimento` | `producao` exige segredo forte |
| `SEDU_JWT_SECRET` | — | **Obrigatório em produção** (sem fallback inseguro) |
| `SEDU_JWT_EXPIRA_HORAS` | `8` | Validade do token |
| `SEDU_DATABASE_URL` | SQLite local | Em produção, URL do PostgreSQL |
| `SEDU_CORS_ORIGINS` | localhost:3000 | Origens permitidas (vírgula) |
| `SEDU_DEMO_HABILITADO` | `true` | Habilita a página `/` e o seed de demo |

## Testes

```powershell
pytest
```

Cobre autenticação, autorização por perfil, ciclo de simulado, correção de nota, máquina de estados e validações de borda (banco de teste isolado em memória).

## Migrações (Alembic)

```powershell
alembic upgrade head                              # aplica
alembic revision --autogenerate -m "descricao"    # cria nova a partir dos modelos
```

## Deploy (Docker)

```bash
docker build -t seduc-simulados-backend .
docker run -p 8000:8000 --env-file .env seduc-simulados-backend
```

## Modelo de dados

Etiquetas (`series`, `materias`, `conteudos`, `niveis`) classificam cada `questao`. A questão é um bloco inseparável com `alternativas` (uma correta). No simulado, a ordem das alternativas é embaralhada por aplicação em `simulado_questoes.alternativas_ordem`, sem desvincular do enunciado. `usuarios` (perfis), `escolas`, `turmas`, `alunos`, `simulados`, `respostas` sustentam o ciclo completo.
