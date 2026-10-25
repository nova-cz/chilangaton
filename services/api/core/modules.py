"""Descubre y monta los routers de modules/<línea>/router.py.

Un módulo que falla al importar no tumba la API: se registra en /health como fallido.
"""

import importlib
import logging
import pkgutil
from dataclasses import dataclass, field

from fastapi import APIRouter, FastAPI

log = logging.getLogger("equilibici.modules")


@dataclass
class ModuleReport:
    loaded: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    failed: dict[str, str] = field(default_factory=dict)


def mount_modules(app: FastAPI, prefix: str, enabled: list[str], package: str = "modules") -> ModuleReport:
    report = ModuleReport()
    root = importlib.import_module(package)
    for info in sorted(pkgutil.iter_modules(root.__path__), key=lambda m: m.name):
        name = info.name
        if not info.ispkg or name.startswith("_"):
            continue
        if enabled and name not in enabled:
            report.skipped.append(name)
            continue
        try:
            router_module = importlib.import_module(f"{package}.{name}.router")
        except ModuleNotFoundError as exc:
            if exc.name == f"{package}.{name}.router":
                report.skipped.append(name)  # todavía sin router.py
                continue
            report.failed[name] = repr(exc)
            log.exception("No se pudo cargar el módulo %s", name)
            continue
        except Exception as exc:  # noqa: BLE001 - aislar fallas de cada línea
            report.failed[name] = repr(exc)
            log.exception("No se pudo cargar el módulo %s", name)
            continue
        router = getattr(router_module, "router", None)
        if not isinstance(router, APIRouter):
            report.failed[name] = "router.py no exporta `router: APIRouter`"
            continue
        app.include_router(router, prefix=prefix)
        report.loaded.append(name)
    return report
