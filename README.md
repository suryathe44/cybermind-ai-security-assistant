# CyberMindSpace AI Security Assistant

A local Day 8 workshop project: a browser calls `POST /api/chat`; Flask validates the topic and mode, applies a per-client rate limit, retrieves approved local knowledge, calls a swappable provider, and returns JSON. Each answer includes an explanation, three learning points, and a takeaway. The default `MockAIProvider` is deterministic and needs no account, internet connection, paid API, or API key.

## Hands-on security labs

After reading an answer, select **Start practical lab** to work through a fictional scenario for prompt injection, RAG poisoning, or MCP object-level access control. Each lab offers choices and a hint. The server checks the selected choice and reveals the evidence, root cause, vulnerable outcome, secure outcome, and fix after a correct answer. Answer keys stay on the server. These labs are safe simulations and do not call outside services.

The lab API provides `GET /api/lab/<topic>` and `POST /api/lab/<topic>/submit` with JSON such as `{"action_id":"separate"}`. Submissions share the same 10 requests per 60 seconds per-client limiter as chat.

## Ubuntu setup

```bash
git clone https://github.com/suryathe44/cybermind-ai-security-assistant.git
cd cybermind-ai-security-assistant
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:5000>. If port 5000 is busy, run `PORT=5001 python app.py` and open port 5001. The server binds to localhost only.

Open the URL above, rather than opening `templates/index.html` as a file. Flask serves the page and the `/api/chat` endpoint together.

## Test

With the virtual environment active:

```bash
python -m unittest discover -s tests -v
```

Try the API directly:

```bash
curl -i -X POST http://127.0.0.1:5000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"topic":"prompt injection","mode":"summary"}'
```

Supported topics are `prompt injection`, `rag poisoning`, and `mcp`. Modes are `summary`, `example`, and `mitigation`. Topic matching ignores case. An unknown topic returns `No approved knowledge found.` with source `none`. The eleventh request from one client within 60 seconds receives HTTP 429. Invalid input receives HTTP 400.

## Project map

- `app.py`: Flask route, validation, and metadata logging
- `knowledge.py`: approved local content and retrieval
- `labs.py`: fictional exercises and server-side answer checking
- `providers.py`: provider interface and deterministic mock
- `security.py`: in-memory sliding-window rate limiter
- `templates/` and `static/`: browser interface
- `tests/`: workshop behavior checks

The limiter is stored in process memory, so it resets when the app restarts and is intended for this local single-process lab. Logs include request ID, client IP, status, and duration; they omit the submitted topic and answer. Replacing the mock with a real provider is a later extension, not required for this version.

## Render deployment

The included `render.yaml` is a Render Blueprint for this repository. Connect the GitHub repository in Render, choose **New > Blueprint**, and select the repository. Render will install dependencies and start one Gunicorn worker. `/health` is the service health check. The base app needs no environment variables or API keys. The in-memory rate limiter is scoped to the running process and resets when the service restarts.
