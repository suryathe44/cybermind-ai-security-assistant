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
                self.assertEqual(len(response.json["details"]["points"]), 3)
                self.assertTrue(response.json["details"]["takeaway"])

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
        page = self.client.get("/").data
        self.assertIn(b"CyberMindSpace AI Security Assistant", page)
        self.assertIn(b"answer-details", page)
        self.assertIn(b"lab-panel", page)
        self.assertIn(b"assessment-form", page)

    def test_labs_keep_answer_keys_server_side(self):
        for topic, correct in (("prompt injection", "separate"), ("rag poisoning", "verify"), ("mcp", "authorize")):
            with self.subTest(topic=topic):
                response = self.client.get(f"/api/lab/{topic}")
                self.assertEqual(response.status_code, 200)
                self.assertIn("scenario", response.json)
                self.assertNotIn("correct", response.json)
                self.assertNotIn("secure_fix", response.json)
                result = self.client.post(f"/api/lab/{topic}/submit", json={"action_id": correct})
                self.assertEqual(result.status_code, 200)
                self.assertTrue(result.json["passed"])
                self.assertIn("secure_fix", result.json)

    def test_lab_wrong_choice_and_validation(self):
        wrong = self.client.post("/api/lab/mcp/submit", json={"action_id": "trust"})
        self.assertEqual(wrong.status_code, 200)
        self.assertFalse(wrong.json["passed"])
        self.assertIn("Authentication", wrong.json["feedback"])
        self.assertNotIn("secure_fix", wrong.json)
        self.assertEqual(self.client.get("/api/lab/unknown").status_code, 404)
        self.assertEqual(self.client.post("/api/lab/mcp/submit", json={"action_id": "bogus"}).status_code, 400)
        self.assertEqual(self.client.post("/api/lab/mcp/submit", data="{", content_type="application/json").status_code, 400)

    def test_lab_submissions_share_rate_limit(self):
        for _ in range(10):
            self.assertEqual(self.client.post("/api/lab/mcp/submit", json={"action_id": "trust"}).status_code, 200)
        self.assertEqual(self.client.post("/api/lab/mcp/submit", json={"action_id": "trust"}).status_code, 429)

    def test_all_levels_and_sources(self):
        for topic in ("prompt injection", "rag poisoning", "mcp"):
            for level in ("easy", "medium", "hard"):
                with self.subTest(topic=topic, level=level):
                    response = self.client.get(f"/api/lab/{topic}?level={level}")
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json["level"], level)
                    self.assertTrue(response.json["reference"]["url"].startswith("https://"))
                    self.assertNotIn("correct", response.json)
        self.assertEqual(self.client.get("/api/lab/mcp?level=expert").status_code, 404)

    def test_assessment_scoring_and_validation(self):
        from assessment import QUESTIONS
        from labs import get_lab

        public = self.client.get("/api/assessment")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(len(public.json["questions"]), 6)
        self.assertNotIn("correct", str(public.json))
        answers = {f"q{index}": get_lab(topic, level)["correct"] for index, (topic, level) in enumerate(QUESTIONS, 1)}
        result = self.client.post("/api/assessment/submit", json={"answers": answers})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json["score"], 6)
        self.assertTrue(result.json["passed"])
        answers["q1"] = "approve"
        answers["q2"] = "use"
        failed = self.client.post("/api/assessment/submit", json={"answers": answers})
        self.assertEqual(failed.json["score"], 4)
        self.assertFalse(failed.json["passed"])
        self.assertEqual(self.client.post("/api/assessment/submit", json={"answers": {"q1": "omit"}}).status_code, 400)

    def test_hindi_chat_labs_and_assessment(self):
        response = self.client.post("/api/chat", json={"topic": "mcp", "mode": "summary", "lang": "hi"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("टूल", response.json["answer"])
        for topic in ("prompt injection", "rag poisoning", "mcp"):
            for level in ("easy", "medium", "hard"):
                with self.subTest(topic=topic, level=level):
                    lab = self.client.get(f"/api/lab/{topic}?level={level}&lang=hi")
                    self.assertEqual(lab.status_code, 200)
                    self.assertNotIn("correct", lab.json)
                    self.assertTrue(any(ord(char) > 0x900 for char in lab.json["scenario"]))
        assessment = self.client.get("/api/assessment?lang=hi")
        self.assertEqual(assessment.status_code, 200)
        self.assertTrue(any(ord(char) > 0x900 for char in assessment.json["questions"][0]["task"]))
        self.assertEqual(self.client.get("/api/assessment?lang=fr").status_code, 400)

    def test_signed_certificate_and_instructor_privacy(self):
        from assessment import QUESTIONS
        from labs import get_lab
        client = create_app(certificate_secret="s" * 40, instructor_token="i" * 32).test_client()
        answers = {f"q{index}": get_lab(topic, level)["correct"] for index, (topic, level) in enumerate(QUESTIONS, 1)}
        passed = client.post("/api/assessment/submit", json={"answers": answers}).json
        self.assertEqual(passed["score"], 6)
        issued = client.post("/api/certificate", json={"proof": passed["certificate_proof"], "name": "Workshop Learner"})
        self.assertEqual(issued.status_code, 200)
        certificate_id = issued.json["certificate_id"]
        self.assertEqual(client.get(f"/verify/{certificate_id}").status_code, 200)
        self.assertEqual(client.get(f"/verify/{certificate_id}changed").status_code, 404)
        self.assertEqual(client.post("/api/certificate", json={"proof": "fake", "name": "Someone"}).status_code, 400)
        self.assertEqual(client.get("/api/instructor/summary").status_code, 403)
        summary = client.get("/api/instructor/summary", headers={"X-Instructor-Token": "i" * 32})
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.json["assessment_scores"]["6"], 1)
        self.assertNotIn("Workshop Learner", str(summary.json))

    def test_two_bonus_practical_labs(self):
        for topic, correct in (("prompt injection", "summarize"), ("mcp", "check_folder")):
            with self.subTest(topic=topic):
                lab = self.client.get(f"/api/lab/{topic}?level=bonus&lang=hi")
                self.assertEqual(lab.status_code, 200)
                self.assertNotIn("correct", lab.json)
                result = self.client.post(f"/api/lab/{topic}/submit", json={"level": "bonus", "action_id": correct, "lang": "hi"})
                self.assertEqual(result.status_code, 200)
                self.assertTrue(result.json["passed"])
                self.assertIn("secure_fix", result.json)
        self.assertEqual(self.client.get("/api/lab/rag poisoning?level=bonus").status_code, 404)


if __name__ == "__main__":
    unittest.main()
