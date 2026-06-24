# Backend FastAPI — imagem de produção/dev.
# Python 3.12 (estável) em vez do 3.14 local que deu problemas de driver.
FROM python:3.12-slim

# Não gera .pyc e não bufferiza stdout (logs aparecem na hora).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependências primeiro (cache de camada).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código do backend (o .dockerignore exclui .env, .venv, *.db).
COPY . .

EXPOSE 8000

# O entrypoint espera o banco, cria as tabelas, popula (se vazio) e sobe a API.
CMD ["python", "docker-entrypoint.py"]
