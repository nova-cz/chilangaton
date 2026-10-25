"""Equilibici API. Ejecutar desde la raíz del repo:

    uvicorn services.api.main:app --reload
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.api.core.config import Settings, get_settings
from services.api.core.errors import register_error_handlers
from services.api.core.modules import mount_modules
from services.api.routers import demo, health

logging.basicConfig(level=logging.INFO)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="Equilibici API",
        version="0.1.0",
        description=(
            "Prototipo independiente para el Chilangotón 2026. No está afiliado a ECOBICI ni a su operador. "
            "Las rutas bajo `/api/v1/demo` usan datos inventados."
        ),
    )
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(health.router)
    if settings.demo_mode:
        app.include_router(demo.router, prefix=settings.api_prefix)
    app.state.modules = mount_modules(app, settings.api_prefix, settings.enabled_modules)
    return app


app = create_app()
