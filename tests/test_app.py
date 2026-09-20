import unittest

from app import create_app
from security import RateLimiter


class ChatTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app(limiter=RateLimiter()).test_client()

    def ask(self, topic, mode="summary"):
        return self.client.post("/api/chat", json={"topic": topic, "mode": mode})

    def test_workshop_topics_and_modes(self):
        cases = [
            ("prompt injection", "summary", "Untrusted text"),
            ("rag poisoning", "mitigation", "provenance"),
            ("mcp", "example", "asset lookup"),
        ]
        for topic, mode, phrase in cases:
            with self.subTest(topic=topic, mode=mode):
                response = self.ask(topic, mode)
                self.assertEqual(response.status_code, 200)
                self.assertIn(phrase, response.json["answer"])
                self.assertEqual(response.json["source"], "approved-local-knowledge")

    def test_unknown_topic_is_controlled(self):
        response = self.ask("unknown topic")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["answer"], "No approved knowledge found.")
        self.assertEqual(response.json["source"], "none")

    def test_validation(self):
        for payload in ({"topic": ""}, {"topic": "x" * 101}, {"topic": 1}):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post("/api/chat", json=payload).status_code, 400)
        self.assertEqual(self.ask("mcp", "invalid").status_code, 400)
        self.assertEqual(self.client.post("/api/chat", data="broken", content_type="application/json").status_code, 400)

    def test_rate_limit(self):
        for _ in range(10):
            self.assertEqual(self.ask("mcp").status_code, 200)
        self.assertEqual(self.ask("mcp").status_code, 429)

    def test_frontend(self):
        self.assertIn(b"CyberMind AI Security Assistant", self.client.get("/").data)


if __name__ == "__main__":
    unittest.main()
