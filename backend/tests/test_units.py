"""Fast unit tests for pure logic (no app/client needed)."""

from __future__ import annotations

from app.domain.counties import normalise_county
from app.schemas.ask import Source
from app.services.rag import RagService


def test_normalise_county():
    assert normalise_county("  galway ") == "Galway"
    assert normalise_county("CORK") == "Cork"
    assert normalise_county("Narnia") is None
    assert normalise_county("") is None


def test_sanitise_removes_label_lines():
    text = "Answer: Kerry is stunning.\nThe Ring of Kerry is a must."
    out = RagService._sanitise(text)
    assert out == "The Ring of Kerry is a must."


def test_sanitise_keeps_plain_answer():
    text = "Dublin has a rich literary history."
    assert RagService._sanitise(text) == text


def test_top_sources_dedupes_and_caps():
    sources = [
        Source(title="a", url="https://x.com/1"),
        Source(title="a-dup", url="https://x.com/1"),
        Source(title="b", url="https://x.com/2"),
        Source(title="c", url="https://x.com/3"),
        Source(title="d", url="https://x.com/4"),
    ]
    out = RagService._top_sources(sources, limit=3)
    assert [s.url for s in out] == ["https://x.com/1", "https://x.com/2", "https://x.com/3"]
