from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NEMORA Backend"
    api_prefix: str = "/api"
    debug: bool = False

    database_url: str = Field(
        default="postgresql+psycopg://nemora:nemora@localhost:5432/nemora",
        alias="DATABASE_URL",
    )
    database_url_sync: str = Field(
        default="postgresql+psycopg2://nemora:nemora@localhost:5432/nemora",
        alias="DATABASE_URL_SYNC",
    )

    jwt_secret: str = Field(default="change-this-secret", alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        alias="CORS_ORIGINS",
    )

    check_in_radius_meters: int = Field(default=100, alias="CHECK_IN_RADIUS_METERS")

    overpass_url: str = Field(default="https://overpass-api.de/api/interpreter", alias="OVERPASS_URL")
    nominatim_url: str = Field(default="https://nominatim.openstreetmap.org", alias="NOMINATIM_URL")
    map_tile_url: str = Field(default="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", alias="MAP_TILE_URL")
    external_provider_timeout_seconds: int = Field(default=20, alias="EXTERNAL_PROVIDER_TIMEOUT_SECONDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
