"""Hashing simples de senha (sha256 + salt fixo).

NÃO use isso em produção — troque por bcrypt/argon2 (passlib) quando a
dependência puder entrar no requirements.txt. Por enquanto, mantém o
backend rodando sem pacotes extras.
"""

import hashlib
import secrets

_SALT_FIXO = "sedu-simulados-dev-salt"


def gerar_hash_senha(senha: str) -> str:
    misturado = (senha + _SALT_FIXO).encode("utf-8")
    return hashlib.sha256(misturado).hexdigest()


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
    return secrets.compare_digest(gerar_hash_senha(senha), hash_armazenado)


def gerar_token_sessao(usuario_id: int) -> str:
    """Token opaco — pra produção, use JWT/sessão server-side."""
    aleatorio = secrets.token_urlsafe(24)
    return f"mock.{usuario_id}.{aleatorio}"
