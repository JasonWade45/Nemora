from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.middleware.rate_limit import SimpleRateLimitMiddleware
from app.modules.auth.routes import router as auth_router
from app.modules.organizations.routes import router as organizations_router
from app.modules.users.routes import router as users_router
from app.modules.doctors.routes import router as doctors_router
from app.modules.workplaces.routes import router as workplaces_router
from app.modules.doctor_assignments.routes import router as doctor_assignments_router
from app.modules.nearby.routes import router as nearby_router
from app.modules.tracking.routes import router as tracking_router
from app.modules.visits.routes import router as visits_router
from app.modules.products.routes import router as products_router
from app.modules.uploads.routes import router as uploads_router
from app.modules.analytics.routes import router as analytics_router
from app.modules.super.routes import router as super_router

settings = get_settings()

# ============ CORS Origins ============
# Always include production + localhost. Merge with whatever settings gives.
PRODUCTION_ORIGINS = [
    "https://nemora-git-main-nemora2.vercel.app",
    "https://nemora-five.vercel.app",
    "https://nemora.fastapicloud.dev",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

def _build_cors_origins() -> list[str]:
    origins: list[str] = []
    try:
        from_settings = settings.cors_origins
        if isinstance(from_settings, list):
            origins.extend([str(o) for o in from_settings if o])
        elif isinstance(from_settings, str):
            # Try parsing as JSON list
            import json
            try:
                parsed = json.loads(from_settings)
                if isinstance(parsed, list):
                    origins.extend([str(o) for o in parsed if o])
                else:
                    origins.append(from_settings)
            except Exception:
                origins.append(from_settings)
    except Exception:
        pass

    # Merge with production list, dedupe
    for o in PRODUCTION_ORIGINS:
        if o not in origins:
            origins.append(o)

    return origins


CORS_ORIGINS = _build_cors_origins()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    app.add_middleware(SimpleRateLimitMiddleware, requests_per_minute=120)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    api_prefix = settings.api_prefix

    app.include_router(auth_router, prefix=api_prefix)
    app.include_router(organizations_router, prefix=api_prefix)
    app.include_router(users_router, prefix=api_prefix)
    app.include_router(doctors_router, prefix=api_prefix)
    app.include_router(workplaces_router, prefix=api_prefix)
    app.include_router(doctor_assignments_router, prefix=api_prefix)
    app.include_router(nearby_router, prefix=api_prefix)
    app.include_router(tracking_router, prefix=api_prefix)
    app.include_router(visits_router, prefix=api_prefix)
    app.include_router(products_router, prefix=api_prefix)
    app.include_router(uploads_router, prefix=api_prefix)
    app.include_router(analytics_router, prefix=api_prefix)
    app.include_router(super_router, prefix=api_prefix)

    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    return app


app = create_app()