"""Local Flask API and web interface for the Day 8 practical."""

import logging
import os
from time import perf_counter
from uuid import uuid4

from flask import Flask, jsonify, render_template, request

from knowledge import retrieve
from providers import MockAIProvider
from security import RateLimiter

ALLOWED_MODES = {"summary", "example", "mitigation"}


def create_app(provider=None, limiter=None):
    app = Flask(__name__)
    app.config["PROVIDER"] = provider or MockAIProvider()
    app.config["RATE_LIMITER"] = limiter or RateLimiter()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    @app.get("/")
    def index():
        return render_template("index.html")

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
                "chat request_id=%s client=%s status=%s duration_ms=%.1f",
                request_id, client, status, (perf_counter() - started) * 1000,
            )
            return jsonify(payload), status

        if not app.config["RATE_LIMITER"].allow(client):
            return respond({"error": "rate limit exceeded"}, 429)

        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return respond({"error": "invalid JSON body"}, 400)

        topic = data.get("topic", "")
        mode = data.get("mode", "summary")
        if not isinstance(topic, str) or not topic.strip() or len(topic.strip()) > 100:
            return respond({"error": "invalid topic"}, 400)
        if not isinstance(mode, str) or mode.strip().lower() not in ALLOWED_MODES:
            return respond({"error": "invalid mode"}, 400)

        topic = topic.strip()
        mode = mode.strip().lower()
        context = retrieve(topic)
        if context is None:
            return respond({
                "topic": topic, "mode": mode,
                "answer": "No approved knowledge found.", "source": "none",
            })
        return respond(app.config["PROVIDER"].generate(topic, mode, context))

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")))
