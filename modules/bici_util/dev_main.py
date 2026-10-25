"""Servidor solo de la Línea 1, para trabajar sin esperar el esqueleto.
Correr desde la raíz del repo:  uvicorn modules.bici_util.dev_main:app --reload --port 8001
Docs en http://localhost:8001/docs"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import router

app = FastAPI(title="Equilibici · Línea 1 (dev)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api/v1")
