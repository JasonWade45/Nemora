from datetime import datetime, timedelta, timezone
from hashlib import pbkdf2_hmac
from hmac import compare_digest
import os
from typing import Any

from jose import JWTError, jwt

from app.core.config import get_settings

PBKDF2_ITERATIONS = 390000


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    digest = pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        algorithm, iterations_str, salt_hex, digest_hex = hashed_password.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    candidate = pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        int(iterations_str),
    ).hex()

    return compare_digest(candidate, digest_hex)


def create_access_token(subject: str, additional_claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta

    payload: dict[str, Any] = {"sub": subject, "exp": expire}
    if additional_claims:
        payload.update(additional_claims)

    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
