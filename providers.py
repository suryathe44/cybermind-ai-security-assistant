"""Provider boundary: replace the mock without changing the API route."""

from typing import Mapping, Protocol


class AIProvider(Protocol):
    def generate(self, topic: str, mode: str, context: Mapping[str, str]) -> dict:
        ...


class MockAIProvider:
    def generate(self, topic: str, mode: str, context: Mapping[str, str]) -> dict:
        return {
            "topic": topic,
            "mode": mode,
            "answer": context.get(mode, context["summary"]),
            "source": "approved-local-knowledge",
        }
