import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
from app.modules.sales.routes import router as sales_router
from app.modules.plan.routes import router as plan_router
from app.modules.notifications.routes import router as notifications_router

settings = get_settings()

ALLOWED_ORIGINS = [
    "https://nemora-git-main-nemora2.vercel.app",
    "https://nemora-five.vercel.app",
    "https://nemora.fastapicloud.dev",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )

    app.add_middleware(SimpleRateLimitMiddleware, requests_per_minute=600)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        origin = request.headers.get("origin", "")
        headers = {}
        if origin in ALLOWED_ORIGINS:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
            headers["Vary"] = "Origin"

        print("=" * 80)
        print("UNHANDLED EXCEPTION:")
        print(traceback.format_exc())
        print("=" * 80)

        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
            headers=headers,
        )

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
    app.include_router(sales_router, prefix=api_prefix)
    app.include_router(plan_router, prefix=api_prefix)
    app.include_router(notifications_router, prefix=api_prefix)

    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    return app


app = create_app()