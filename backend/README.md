# TravelPia Backend (FastAPI)

The compute/secret-bound slice of TravelPia (Dev B). It exposes the AI Q&A and
image endpoints the React Native app calls. Auth is a single Supabase-issued
JWT, verified here (no session state) — currently **dormant** so front-end and
backend can integrate in parallel.

## Endpoints (frozen contract)

| Method | Path            | Purpose                                          |
| ------ | --------------- | ------------------------------------------------ |
| `POST` | `/ask`          | Grounded Q&A → `{answer, sources, images, ...}`  |
| `POST` | `/auth/refresh` | Exchange a refresh token for a fresh session     |
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

### Plans, quota and rate limiting

`/ask` is metered per account. A user's `plan` (`free` | `premium`) lives on
`profiles` and is resolved through a short TTL cache; limits come from
`Settings`, so they are tunable per environment without a deploy.

**Only grounded answers are charged.** `enforce_ask_quota` runs before any
upstream call — a blocked request costs nothing — and the increment happens
after the answer, gated on `response.grounded`. Small talk, empty searches and
upstream failures are therefore free. Every answer echoes a `quota` object so
the client can display the remaining allowance without a second endpoint.

Counting is done by an atomic Postgres statement (`increment_ask_usage`), not
read-then-write, so concurrent asks can't both read N and write N+1.

Two failure policies, deliberately different:

| Failure | Policy | Why |
| --- | --- | --- |
| Usage store unreachable | **fail open**, serve unmetered | A store blip must not take Ask down for paying users. Alert on this log line. |
| Plan lookup fails | **fail closed** to `free` | An outage must never grant premium. |

Separately, `enforce_rate_limit` is an in-process abuse fence (default 20
requests/minute, keyed by user or client IP) on `/ask`, `/places` and
`/images`. It is approximate and per-instance by design — the durable quota is
what protects spend. `quota_enabled=false` is a kill switch that disables
metering without a deploy.

### Soft auth (the rollout stage)

`AUTH_REQUIRED` controls *enforcement*, not *identification*. With it off:

| Request | Principal | Metered? |
| --- | --- | --- |
| Carries a valid JWT | that user | **yes** |
| Carries a bad/expired JWT | anonymous | no |
| Carries no token (older app build) | anonymous | no |

So an updated app is metered per account immediately, while builds already on
the store keep working untouched — which is what makes a staged rollout
possible. An unverifiable token degrades to anonymous rather than 401: the route
is open in this mode, so a bad token must not fail a request that would have
succeeded without one.

Anonymous callers keep full capability (including detailed mode) so behaviour
matches today's shipped app exactly, and remain covered by the rate limiter.
Flip `AUTH_REQUIRED=true` once the updated build has adoption.

Apply [`migrations/002_premium_and_usage.sql`](migrations/002_premium_and_usage.sql)
before deploying this.

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
