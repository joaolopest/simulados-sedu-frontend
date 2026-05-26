# SEDUC Questões — Banco de Questões

Sistema de cadastro e organização de questões para a Secretaria de Educação de Sergipe.
Projeto da residência em software.

## Stack

- Python 3.14
- SQLAlchemy 2.x (ORM)
- SQLite (desenvolvimento) → PostgreSQL (produção)

## Modelo de dados

- **Materia** — disciplina (Matemática, Português, …)
- **Assunto** — tópico dentro de uma matéria (Equação do 1º grau, …)
- **Questao** — enunciado vinculado a matéria, assunto, série e dificuldade
- **Alternativa** — opções de resposta vinculadas a uma questão (uma é correta)

As alternativas podem ser embaralhadas na hora de gerar a prova sem perder o vínculo com a questão.

## Como rodar

```powershell
# 1. Criar e ativar o ambiente virtual
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Criar as tabelas no banco
python scripts\init_db.py

# 4. Rodar o teste de inserção
python scripts\teste_inserir.py
```

## Estrutura

```
seduc-questoes/
├── app/
│   ├── database.py   # engine, sessão, Base
│   ├── enums.py      # Serie, Dificuldade
│   └── models.py     # ORM: Materia, Assunto, Questao, Alternativa
└── scripts/
    ├── init_db.py        # cria tabelas
    └── teste_inserir.py  # cadastra questão de exemplo
```
