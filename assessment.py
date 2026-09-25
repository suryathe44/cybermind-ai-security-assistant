"""Mixed-topic assessment with server-side keys and randomized presentation."""

from secrets import SystemRandom

from labs import REVIEWED_ON, get_lab

QUESTIONS = [
    ("prompt injection", "medium"),
    ("rag poisoning", "medium"),
    ("mcp", "medium"),
    ("prompt injection", "hard"),
    ("rag poisoning", "hard"),
    ("mcp", "hard"),
]


def public_assessment():
    randomizer = SystemRandom()
    questions = []
    for index, (topic, level) in enumerate(QUESTIONS, 1):
        lab = get_lab(topic, level)
        actions = [dict(action) for action in lab["actions"]]
        randomizer.shuffle(actions)
        questions.append({"id": f"q{index}", "topic": topic, "level": level,
                          "scenario": lab["scenario"], "task": lab["task"],
                          "actions": actions})
    randomizer.shuffle(questions)
    return {
        "questions": questions,
        "passing_score": 5,
        "reviewed_on": REVIEWED_ON,
    }


def grade(answers):
    if not isinstance(answers, dict) or set(answers) != {f"q{i}" for i in range(1, 7)}:
        return None
    results = []
    for index, (topic, level) in enumerate(QUESTIONS, 1):
        lab = get_lab(topic, level)
        selected = answers[f"q{index}"]
        if not isinstance(selected, str) or selected not in {action["id"] for action in lab["actions"]}:
            return None
        results.append({"id": f"q{index}", "correct": selected == lab["correct"],
                        "explanation": "Correct defense selected." if selected == lab["correct"] else lab["feedback"][selected]})
    score = sum(result["correct"] for result in results)
    return {"score": score, "total": len(QUESTIONS), "passed": score >= 5, "results": results}
