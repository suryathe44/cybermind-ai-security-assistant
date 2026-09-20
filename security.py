"""In-memory, per-client sliding-window limiter for the local workshop app."""

from collections import defaultdict, deque
from threading import Lock
from time import monotonic


class RateLimiter:
    def __init__(self, limit: int = 10, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self._requests = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = monotonic()
        with self._lock:
            times = self._requests[key]
            while times and now - times[0] >= self.window_seconds:
                times.popleft()
            if len(times) >= self.limit:
                return False
            times.append(now)
            return True
