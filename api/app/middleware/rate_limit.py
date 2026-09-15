from collections import defaultdict, deque
from time import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class SimpleRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.storage: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time()
        window_start = now - 60
        bucket = self.storage[client_ip]

        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= self.requests_per_minute:
            return JSONResponse(
                {"detail": "Rate limit exceeded. Please retry in a minute."},
                status_code=429,
            )

        bucket.append(now)
        return await call_next(request)
