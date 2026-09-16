from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

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

# Allowed origins — hardcoded to guarantee they're always present
ALLOWED_ORIGINS = [
    "https://nemora-git-main-nemora2.vercel.app",
    "https://nemora-five.vercel.app",
    "https://nemora.fastapicloud.dev",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


class ForceCORSMiddleware(BaseHTTPMiddleware):
    """Guarantees CORS headers on EVERY response, including errors and OPTIONS."""

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        allowed = origin in ALLOWED_ORIGINS

        # Handle preflight immediately
        if request.method == "OPTIONS":
            response = Response(status_code=204)
        else:
            try:
                response = await call_next(request)
            except Exception:
                response = Response(status_code=500)

        if allowed and origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Max-Age"] = "3600"
            response.headers["Vary"] = "Origin"

        return response


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    # Order matters! The LAST added middleware is the OUTERMOST (runs first).
    # 1. Rate limit (innermost)
    app.add_middleware(SimpleRateLimitMiddleware, requests_per_minute=600)

    # 2. FastAPI's CORS (middle layer)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # 3. Force CORS — OUTERMOST, runs first, guarantees headers
    app.add_middleware(ForceCORSMiddleware)

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