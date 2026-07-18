# TravelPia Backend (FastAPI)

The compute/secret-bound slice of TravelPia (Dev B). It exposes the AI Q&A and
image endpoints the React Native app calls. Auth is a single Supabase-issued
JWT, verified here (no session state) — currently **dormant** so front-end and
backend can integrate in parallel.

## Endpoints (frozen contract)

| Method | Path            | Purpose                                          |
| ------ | --------------- | ------------------------------------------------ |
| `POST` | `/ask`          | Grounded Q&A → `{answer, sources, images, ...}`  |
| `GET`  | `/images`       | Image search → `{images}` (Serper Google Images) |
| `GET`  | `/places`       | Map places search → `{places}` (Serper Places)   |
| `GET`  | `/places/photo` | One representative photo for a place (Serper)    |
| `GET`  | `/health`       | Liveness                                         |
| `GET`  | `/health/ready` | Readiness + which capabilities are configured    |

`GET /places?query=restaurants&county=Galway` returns real places with
coordinates, ratings and categories (for map pins), proxied via Serper's Places
endpoint so the key stays server-side.

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
                          ├─ intent.py  router: chat vs. search + query rewrite
                          ├─ llm.py     provider-agnostic (OpenAI default)
                          ├─ search.py  Serper → Wikipedia fallback
                          ├─ images.py  Serper Google Images
                          ├─ places.py  Serper Places (map pins + photos)
                          └─ rag.py     route → search ∥ (llm + images)
```

### Conversational routing

`/ask` accepts an optional `history` (recent `{role, content}` turns). Each
message is first sent to the **intent router**, which decides:

- **chat** — greetings, acknowledgements ("okay", "thanks"), small talk, or
  questions about the assistant → a friendly reply, **no web search**, no
  sources. (Fixes the "type 'okay' and get a karaoke result" problem.)
- **search** — a real information need → the router rewrites the message into a
  standalone, context-resolved query (e.g. "what about food there?" →
  "food in Galway Ireland") and the RAG path runs as normal.

A no-results search returns a friendly in-conversation reply (200), not a hard
error. The router fails safe to "search" if its output can't be parsed.

Design choices:
- **Fully async** — `httpx.AsyncClient` + async OpenAI client; the answer and
  image fetch run concurrently (`asyncio.gather`), roughly halving latency.
- **Provider-agnostic LLM** — swap OpenAI↔Anthropic via `LLM_PROVIDER`; one
  `LLMClient` interface, no call-site changes.
- **Images via Serper** — answer-gallery photos, place photos, and map places
  all use the one Serper key (Google Images/Places). `UNSPLASH_ACCESS_KEY` is
  no longer used; to switch images back to Unsplash, restore `images.py`.
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
