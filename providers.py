"""Provider boundary: replace the mock without changing the API route."""

from typing import Any, Mapping, Protocol


class AIProvider(Protocol):
    def generate(self, topic: str, mode: str, context: Mapping[str, Any]) -> dict:
        ...


class MockAIProvider:
    def generate(self, topic: str, mode: str, context: Mapping[str, Any]) -> dict:
        return {
            "topic": topic,
            "mode": mode,
            "answer": context.get(mode, context["summary"]),
            "details": context["details"][mode],
            "source": "approved-local-knowledge",
        }
