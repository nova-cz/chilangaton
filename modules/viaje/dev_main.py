"""Servidor solo de la Línea 3, para trabajar sin esperar el esqueleto.
Correr desde la raíz del repo:  uvicorn modules.viaje.dev_main:app --reload --port 8003
Docs en http://localhost:8003/docs"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import router

app = FastAPI(title="Equilibici · Línea 3 (dev)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api/v1")
