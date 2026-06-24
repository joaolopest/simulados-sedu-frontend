from __future__ import annotations

import secrets
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

SEGREDOS_INSEGUROS = {
    "",
    "troque-esta-chave-em-producao",
    "cole-aqui-um-segredo-forte",
    "changeme",
    "secret",
    "secret-key",
}

TAMANHO_MINIMO_SEGREDO = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="SEDU_",
        extra="ignore",
    )

    ambiente: str = "desenvolvimento"
    jwt_secret: str = ""
    jwt_expira_horas: int = 8
    database_url: str = Field(
        default_factory=lambda: f"sqlite:///{BASE_DIR / 'seduc_questoes.db'}"
    )
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    demo_habilitado: bool = False

    @property
    def em_producao(self) -> bool:
        return self.ambiente.strip().lower() in {"producao", "production", "prod"}

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_origins(cls, valor):
        if isinstance(valor, str):
            return [item.strip() for item in valor.split(",") if item.strip()]
        return valor

    def validar(self) -> "Settings":
        inseguro = (
            self.jwt_secret in SEGREDOS_INSEGUROS
            or len(self.jwt_secret) < TAMANHO_MINIMO_SEGREDO
        )
        if inseguro and self.em_producao:
            raise RuntimeError(
                "SEDU_JWT_SECRET ausente, fraco ou inseguro em produção (mínimo "
                f"{TAMANHO_MINIMO_SEGREDO} caracteres). Gere um forte com: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))" '
                "e defina-o no ambiente antes de subir a aplicação."
            )
        if inseguro:
            # Fora de produção não travamos o desenvolvimento, mas nunca usamos o
            # placeholder público: geramos um segredo efêmero por processo.
            self.jwt_secret = secrets.token_urlsafe(48)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings().validar()


settings = get_settings()
