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

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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

    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    return app


app = create_app()