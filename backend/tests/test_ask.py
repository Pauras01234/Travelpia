"""Behavioural tests for POST /ask."""

from __future__ import annotations

from app.schemas.ask import Image, Source
from app.services.intent import RouteDecision
from app.services.search import SearchResult
from tests.conftest import FakeLLM


def test_ask_returns_answer_sources_and_images(make_client):
    client, fakes = make_client(
        search=SearchResult(
            ["Galway has great coastal walks along the prom."],
            [
                Source(title="Failte Ireland", url="https://ex.com/1"),
                Source(title="Galway Tourism", url="https://ex.com/2"),
            ],
        ),
        images=[Image(url="https://img/1.jpg", alt="coast", credit="Photo by A")],
        llm=FakeLLM("Galway is made for coastal strolls."),
    )
    with client:
        resp = client.post(
            "/ask",
            json={"county": "Galway", "question": "best coastal walks?", "mode": "fast"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["answer"] == "Galway is made for coastal strolls."
    assert len(body["sources"]) == 2
    assert body["images"][0]["credit"] == "Photo by A"
    assert body["county"] == "Galway"
    assert body["grounded"] is True
    assert body["cached"] is False
    assert resp.headers.get("X-Request-ID")


def test_ask_normalises_county_case(make_client):
    client, _ = make_client()
    with client:
        resp = client.post(
            "/ask", json={"county": "galway", "question": "things to do?"}
        )
    assert resp.status_code == 200
    assert resp.json()["county"] == "Galway"


def test_ask_rejects_unknown_county(make_client):
    client, _ = make_client()
    with client:
        resp = client.post(
            "/ask", json={"county": "Atlantis", "question": "things to do?"}
        )
    assert resp.status_code == 422
    assert resp.json()["error"] == "validation_error"


def test_ask_rejects_blank_question(make_client):
    client, _ = make_client()
    with client:
        resp = client.post("/ask", json={"county": "Cork", "question": "   "})
    assert resp.status_code == 422


def test_ask_soft_reply_when_no_grounding(make_client):
    # No grounding is a friendly in-conversation reply, not an error card.
    client, fakes = make_client(search=SearchResult([], []))
    with client:
        resp = client.post(
            "/ask", json={"county": "Mayo", "question": "hidden gems?"}
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["grounded"] is False
    assert body["sources"] == []
    assert "Mayo" in body["answer"]


def test_smalltalk_skips_search(make_client):
    # "Okay" should be answered conversationally with NO web search.
    client, fakes = make_client(
        route=RouteDecision(
            route="chat", reply="Glad that helps! What else can I find?", search_query=""
        )
    )
    with client:
        resp = client.post("/ask", json={"county": "Galway", "question": "Okay"})
    body = resp.json()
    assert resp.status_code == 200
    assert body["answer"] == "Glad that helps! What else can I find?"
    assert body["sources"] == []
    assert body["grounded"] is False
    # The whole point: no search, no LLM answer-generation call.
    assert fakes["search"].calls == 0
    assert fakes["llm"].calls == 0


def test_followup_uses_rewritten_query(make_client):
    # The router resolves "there" → a standalone query used for retrieval.
    client, fakes = make_client(
        route=RouteDecision(
            route="search", reply="", search_query="fresh seafood in Galway Ireland"
        ),
    )
    with client:
        resp = client.post(
            "/ask",
            json={
                "county": "Galway",
                "question": "where's good to eat there?",
                "history": [
                    {"role": "user", "content": "best coastal walks?"},
                    {"role": "assistant", "content": "Try the Salthill prom."},
                ],
            },
        )
    assert resp.status_code == 200
    assert fakes["search"].last_query == "fresh seafood in Galway Ireland"


def test_ask_is_cached_on_repeat(make_client):
    client, fakes = make_client(llm=FakeLLM("cached answer"))
    with client:
        first = client.post(
            "/ask", json={"county": "Clare", "question": "best cliffs?"}
        )
        second = client.post(
            "/ask", json={"county": "Clare", "question": "best cliffs?"}
        )
    assert first.json()["cached"] is False
    assert second.json()["cached"] is True
    # The LLM must only be hit once — the second answer came from cache.
    assert fakes["llm"].calls == 1


def test_ask_strips_prompt_echo(make_client):
    # A model that echoes scaffolding should be sanitised.
    echoed = "County: Galway\nQuestion: walks?\nGalway has wonderful walks."
    client, _ = make_client(llm=FakeLLM(echoed))
    with client:
        resp = client.post(
            "/ask", json={"county": "Galway", "question": "walks?"}
        )
    answer = resp.json()["answer"]
    assert answer == "Galway has wonderful walks."
    assert "County:" not in answer
    assert "Question:" not in answer
