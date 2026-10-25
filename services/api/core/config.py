"""Configuración por variables de entorno (sin secretos en el repo)."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "local"
    # DEMO: expone /api/v1/demo/* con fixtures inventados. Apagar en cuanto haya datos reales.
    demo_mode: bool = True
    # Lista separada por comas. Ej: "https://equilibici.vercel.app,http://localhost:3000"
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["http://localhost:3000"])
    # Vacío = cargar todos los módulos de modules/*. Ej: "distribucion,viaje"
    enabled_modules: Annotated[list[str], NoDecode] = Field(default_factory=list)
    api_prefix: str = "/api/v1"

    @field_validator("cors_origins", "enabled_modules", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
