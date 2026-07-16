# TravelPia Backend (FastAPI)

The compute/secret-bound slice of TravelPia (Dev B). It exposes the AI Q&A and
image endpoints the React Native app calls. Auth is a single Supabase-issued
JWT, verified here (no session state) — currently **dormant** so front-end and
backend can integrate in parallel.

## Endpoints (frozen contract)

| Method | Path            | Purpose                                          |
| ------ | --------------- | ------------------------------------------------ |
| `POST` | `/ask`          | Grounded Q&A → `{answer, sources, images, ...}`  |
| `GET`  | `/images`       | Unsplash proxy → `{images}` (key stays server)   |
| `GET`  | `/health`       | Liveness                                         |
| `GET`  | `/health/ready` | Readiness + which capabilities are configured    |

Interactive docs at `/docs` when running.

### `POST /ask`

```jsonc
// request
{ "county": "Galway", "question": "best coastal walks?", "mode": "detailed" }

// response
{
  "answer": "Galway is made for coastal strolls...",
  "sources": [{ "title": "Failte Ireland", "url": "https://..." }],
  "images":  [{ "url": "https://...", "alt": "coast", "credit": "Photo by A" }],
  "county": "Galway", "mode": "detailed", "grounded": true, "cached": false
}
```

`mode` is `fast` (concise) or `detailed` (thorough) — the design's Fast/Detailed
toggle. `county` must be one of the 32 counties (case-insensitive).

## Architecture

```
routes ──> deps (DI) ──> services ──> external APIs
 (HTTP)                   │
                          ├─ llm.py     provider-agnostic (OpenAI default)
                          ├─ search.py  Serper → Wikipedia fallback
                          ├─ images.py  Unsplash proxy
                          └─ rag.py     orchestrates: search ∥ (llm + images)
```

Design choices:
- **Fully async** — `httpx.AsyncClient` + async OpenAI client; the answer and
  image fetch run concurrently (`asyncio.gather`), roughly halving latency.
- **Provider-agnostic LLM** — swap OpenAI↔Anthropic via `LLM_PROVIDER`; one
  `LLMClient` interface, no call-site changes.
- **Soft-fail grounding** — search/image outages degrade gracefully; only a
  total lack of grounding returns `404`, and a missing LLM key returns `503`.
- **Uniform errors** — every failure returns `{error, detail, request_id}`.
- **Caching** — TTL cache on search, images, and whole answers; swap the
  `TTLCache` for Redis later without touching call sites.
- **Pluggable auth** — set `AUTH_REQUIRED=true` + `SUPABASE_URL` to enforce
  JWT verification; nothing else changes.

## Run

```bash
cd backend
python -m pip install -r requirements-dev.txt
cp .env.example .env          # then fill in OPENAI_API_KEY, SERPER_API_KEY, UNSPLASH_ACCESS_KEY
python -m uvicorn app.main:app --reload --port 8000
```

Windows PowerShell: `Copy-Item .env.example .env`, and use the repo venv
(`..\.venv3\Scripts\python.exe`).

## Test

```bash
cd backend
python -m pytest
```

Tests replace the three external services (search/images/LLM) with in-memory
fakes — no network, deterministic. They cover the happy path, validation,
no-results, caching, and the prompt-echo sanitiser.

## Configuration

See [`.env.example`](.env.example). All config is read once into a typed
`Settings` object; nothing reads `os.environ` directly.
