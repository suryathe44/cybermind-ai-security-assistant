"""Local Flask API and web interface for the Day 8 practical."""

import logging
import os
from time import perf_counter
from uuid import uuid4

from flask import Flask, jsonify, make_response, render_template, request

from assessment import QUESTIONS, grade, public_assessment
from certificates import assessment_proof, issue, score_from_proof, verify
from knowledge import retrieve
from labs import LEVELS, evaluate, public_lab
from providers import MockAIProvider
from security import RateLimiter
from translations import LAB_HI, localize_chat, localize_lab

ALLOWED_MODES = {"summary", "example", "mitigation"}


def create_app(provider=None, limiter=None, certificate_secret=None):
    app = Flask(__name__)
    app.config["PROVIDER"] = provider or MockAIProvider()
    app.config["RATE_LIMITER"] = limiter or RateLimiter()
    app.config["CERTIFICATE_SECRET"] = certificate_secret if certificate_secret is not None else os.environ.get("CERTIFICATE_SECRET", "")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    @app.get("/")
    def index():
        response = make_response(render_template("index.html"))
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.post("/api/chat")
    def chat():
        request_id = uuid4().hex[:12]
        started = perf_counter()
        client = request.remote_addr or "local"

        def respond(payload, status=200):
            app.logger.info(
                "chat request_id=%s status=%s duration_ms=%.1f",
                request_id, status, (perf_counter() - started) * 1000,
            )
            return jsonify(payload), status

        if not app.config["RATE_LIMITER"].allow(client):
            return respond({"error": "rate limit exceeded"}, 429)

        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return respond({"error": "invalid JSON body"}, 400)

        topic = data.get("topic", "")
        mode = data.get("mode", "summary")
        lang = data.get("lang", "en")
        if not isinstance(topic, str) or not topic.strip() or len(topic.strip()) > 100:
            return respond({"error": "invalid topic"}, 400)
        if not isinstance(mode, str) or mode.strip().lower() not in ALLOWED_MODES:
            return respond({"error": "invalid mode"}, 400)
        if lang not in ("en", "hi"):
            return respond({"error": "invalid language"}, 400)

        topic = topic.strip()
        mode = mode.strip().lower()
        context = retrieve(topic)
        if context is None:
            return respond({
                "topic": topic, "mode": mode,
                "answer": "स्वीकृत जानकारी नहीं मिली।" if lang == "hi" else "No approved knowledge found.", "source": "none",
            })
        result = app.config["PROVIDER"].generate(topic, mode, context)
        return respond(localize_chat(result, topic.casefold(), mode) if lang == "hi" else result)

    @app.get("/api/lab/<topic>")
    def lab(topic):
        topic, level, lang = topic.strip().lower(), request.args.get("level", "easy"), request.args.get("lang", "en")
        if lang not in ("en", "hi"):
            return jsonify({"error": "invalid language"}), 400
        exercise = public_lab(topic, level)
        if exercise is None:
            return jsonify({"error": "unknown lab"}), 404
        return jsonify(localize_lab(exercise, topic, level) if lang == "hi" else exercise)

    @app.post("/api/lab/<topic>/submit")
    def submit_lab(topic):
        client = request.remote_addr or "local"
        if not app.config["RATE_LIMITER"].allow(client):
            return jsonify({"error": "rate limit exceeded"}), 429
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or not isinstance(data.get("action_id"), str) or data.get("level", "easy") not in LEVELS or data.get("lang", "en") not in ("en", "hi"):
            return jsonify({"error": "invalid answer"}), 400
        result = evaluate(topic.strip().lower(), data["action_id"], data.get("level", "easy"))
        if result is None:
            return jsonify({"error": "invalid lab or answer"}), 400
        return jsonify(localize_lab(result, topic.strip().lower(), data.get("level", "easy"), data["action_id"]) if data.get("lang") == "hi" else result)

    @app.get("/api/assessment")
    def assessment():
        lang = request.args.get("lang", "en")
        if lang not in ("en", "hi"):
            return jsonify({"error": "invalid language"}), 400
        result = public_assessment()
        if lang == "hi":
            result["questions"] = [localize_lab(question, question["topic"], question["level"]) for question in result["questions"]]
        return jsonify(result)

    @app.post("/api/assessment/submit")
    def submit_assessment():
        client = request.remote_addr or "local"
        if not app.config["RATE_LIMITER"].allow(client):
            return jsonify({"error": "rate limit exceeded"}), 429
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or data.get("lang", "en") not in ("en", "hi"):
            return jsonify({"error": "invalid answers"}), 400
        result = grade(data.get("answers"))
        if result is None:
            return jsonify({"error": "invalid answers"}), 400
        if data.get("lang") == "hi":
            for (topic, level), item in zip(QUESTIONS, result["results"]):
                item["explanation"] = "सही बचाव चुना गया।" if item["correct"] else LAB_HI[(topic, level)]["feedback"][data["answers"][item["id"]]]
        if result["passed"]:
            result["certificate_proof"] = assessment_proof(app.config["CERTIFICATE_SECRET"], result["score"])
        return jsonify(result)

    @app.post("/api/certificate")
    def create_certificate():
        client = request.remote_addr or "local"
        if not app.config["RATE_LIMITER"].allow(client):
            return jsonify({"error": "rate limit exceeded"}), 429
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "invalid request"}), 400
        score = score_from_proof(app.config["CERTIFICATE_SECRET"], data.get("proof"))
        if score is None:
            return jsonify({"error": "certificate issuance unavailable or assessment proof expired"}), 400
        certificate_id = issue(app.config["CERTIFICATE_SECRET"], data.get("name"), score)
        if certificate_id is None:
            return jsonify({"error": "name must contain 2 to 70 characters"}), 400
        return jsonify({"certificate_id": certificate_id, "verify_url": f"{request.url_root.rstrip('/')}/verify/{certificate_id}"})

    @app.get("/verify/<certificate_id>")
    def verify_certificate(certificate_id):
        record = verify(app.config["CERTIFICATE_SECRET"], certificate_id)
        return render_template("verify.html", record=record), 200 if record else 404

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")))
