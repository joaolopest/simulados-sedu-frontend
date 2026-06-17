from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time

import jwt

CHAVE_SECRETA = os.environ.get("SEDU_JWT_SECRET", "troque-esta-chave-em-producao")
ALGORITMO = "HS256"
HORAS_VALIDADE = 8


def gerar_hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    derivada = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, 100_000)
    return base64.b64encode(salt + derivada).decode("ascii")


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
    try:
        dados = base64.b64decode(hash_armazenado.encode("ascii"))
    except Exception:
        return False
    salt, derivada = dados[:16], dados[16:]
    nova = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, 100_000)
    return hmac.compare_digest(derivada, nova)


def criar_token(usuario_id: int, perfil: str) -> str:
    agora = int(time.time())
    payload = {
        "sub": str(usuario_id),
        "perfil": perfil,
        "iat": agora,
        "exp": agora + HORAS_VALIDADE * 3600,
    }
    return jwt.encode(payload, CHAVE_SECRETA, algorithm=ALGORITMO)


def decodificar_token(token: str) -> dict:
    return jwt.decode(token, CHAVE_SECRETA, algorithms=[ALGORITMO])


def criar_token_reset(usuario_id: int, horas: int = 1) -> str:
    """Token curto pra redefinição de senha (claim tipo='reset')."""
    agora = int(time.time())
    payload = {
        "sub": str(usuario_id),
        "tipo": "reset",
        "iat": agora,
        "exp": agora + horas * 3600,
    }
    return jwt.encode(payload, CHAVE_SECRETA, algorithm=ALGORITMO)
