"""Anonymous process-local counters for a workshop instructor view."""

from collections import Counter
from threading import Lock


class AnonymousMetrics:
    def __init__(self):
        self._lock = Lock()
        self.lab_attempts = Counter()
        self.lab_misses = Counter()
        self.assessment_scores = Counter()
        self.question_misses = Counter()

    def record_lab(self, topic, level, passed):
        key = f"{topic}|{level}"
        with self._lock:
            self.lab_attempts[key] += 1
            if not passed:
                self.lab_misses[key] += 1

    def record_assessment(self, result):
        with self._lock:
            self.assessment_scores[str(result["score"])] += 1
            for item in result["results"]:
                if not item["correct"]:
                    self.question_misses[item["id"]] += 1

    def summary(self):
        with self._lock:
            return {
                "lab_attempts": dict(self.lab_attempts),
                "lab_misses": dict(self.lab_misses),
                "assessment_scores": dict(self.assessment_scores),
                "question_misses": dict(self.question_misses),
                "privacy": "Aggregate counts only; no names, IP addresses, answers, or learner IDs are stored.",
                "retention": "Counters reset when this app process restarts.",
            }
