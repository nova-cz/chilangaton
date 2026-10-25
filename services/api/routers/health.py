from fastapi import APIRouter, Request

router = APIRouter(tags=["sistema"])


@router.get("/health", summary="Estado del servicio")
def health(request: Request) -> dict[str, object]:
    settings = request.app.state.settings
    report = request.app.state.modules
    return {
        "status": "ok",
        "service": "equilibici-api",
        "version": request.app.version,
        "env": settings.app_env,
        "demo_mode": settings.demo_mode,
        "modules": {"loaded": report.loaded, "skipped": report.skipped, "failed": report.failed},
    }
