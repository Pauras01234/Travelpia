import os
import re
import time
from typing import List, Tuple, Dict, Any

import requests
import gradio as gr
from dotenv import load_dotenv
from openai import OpenAI

# ===============================
# ENV
# ===============================
load_dotenv()

SERPER_KEY = os.getenv("SERPER_API_KEY", "").strip()
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()

COUNTIES = [
    "Antrim","Armagh","Carlow","Cavan","Clare","Cork","Derry","Donegal","Down",
    "Dublin","Fermanagh","Galway","Kerry","Kildare","Kilkenny","Laois","Leitrim",
    "Limerick","Longford","Louth","Mayo","Meath","Monaghan","Offaly","Roscommon",
    "Sligo","Tipperary","Tyrone","Waterford","Westmeath","Wexford","Wicklow"
]

# Cache
CACHE_TTL_SEC = 1200
_cache: Dict[str, Dict[str, Any]] = {}


def cache_get(key: str):
    rec = _cache.get(key)
    if not rec:
        return None
    if (time.time() - rec["t"]) > CACHE_TTL_SEC:
        _cache.pop(key, None)
        return None
    return rec["data"]


def cache_set(key: str, data: Any):
    _cache[key] = {"t": time.time(), "data": data}


# ===============================
# HOSTED LLM
# ===============================
# Single choke point for text generation. To switch providers later
# (Claude, Gemini, etc.) edit ONLY this function and the client above —
# the rest of the app just calls llm_generate(system, user).
_llm_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def llm_generate(system_prompt: str, user_prompt: str, max_tokens: int = 350) -> str:
    if not _llm_client:
        return "The travel assistant isn't configured yet (missing OPENAI_API_KEY)."
    try:
        resp = _llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.45,
            max_tokens=max_tokens,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception:
        return "Sorry, I couldn't generate an answer right now. Please try again."


# ===============================
# GOOGLE SEARCH
# ===============================
def google_search(query: str, n: int = 6):
    if not SERPER_KEY:
        return [], []

    key = f"serper::{n}::{query}"
    cached = cache_get(key)
    if cached:
        return cached

    try:
        headers = {"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"}
        payload = {"q": query, "gl": "ie", "hl": "en"}
        r = requests.post("https://google.serper.dev/search", headers=headers, json=payload, timeout=8)
        r.raise_for_status()

        data = r.json()
        snippets, links = [], []

        for item in (data.get("organic") or [])[:n]:
            txt = item.get("snippet") or item.get("title") or ""
            link = item.get("link") or ""
            txt = re.sub(r"\s+", " ", txt).strip()
            if txt:
                snippets.append(txt)
            if link:
                links.append((item.get("title", "Source"), link))

        cache_set(key, (snippets, links))
        return snippets, links
    except:
        return [], []


# ===============================
# WIKIPEDIA FALLBACK
# ===============================
def wiki_fallback(county: str, question: str):
    topic = f"{county} Ireland {question}".replace(" ", "_")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{topic}"
    try:
        r = requests.get(url, timeout=6)
        if r.status_code == 200:
            return [r.json().get("extract", "")]
    except:
        pass
    return []


# ===============================
# PROMPT
# ===============================
def build_prompt(county: str, question: str, info: List[str], mode: str = "fast") -> Tuple[str, str]:
    # Detailed mode gets more context and a longer, richer answer instruction.
    if mode == "detailed":
        context = " ".join(info)[:3500]
        length_rule = (
            "Give a thorough, detailed answer of at least 6 sentences. "
            "Include specific names, places, and practical tips where the information supports them."
        )
    else:
        context = " ".join(info)[:2000]
        length_rule = "Give a concise answer in 3–5 sentences."

    system_prompt = (
        "You are Travelpia, a friendly travel expert on Ireland. "
        "Answer using only the information provided. " + length_rule
    )
    user_prompt = f"County: {county}\nQuestion: {question}\n\nInformation:\n{context}"
    return system_prompt, user_prompt


# ===============================
# UNSPLASH IMAGES
# ===============================
def unsplash_images_html(county: str, query: str, per_page: int = 6):
    if not UNSPLASH_ACCESS_KEY:
        return ""

    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": f"{query} {county} Ireland",
        "per_page": per_page,
        "orientation": "landscape"
    }
    headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}

    try:
        r = requests.get(url, headers=headers, params=params, timeout=6)
        if r.status_code != 200:
            return ""

        cards = []
        for res in r.json().get("results", []):
            img = res["urls"]["regular"]
            user = res["user"]["name"]
            cards.append(f"""
            <div style="border-radius:10px; overflow:hidden;">
                <img src="{img}" style="width:100%;height:180px;object-fit:cover;" loading="lazy"/>
                <div style="font-size:12px;padding:4px;">📸 {user}</div>
            </div>
            """)

        return (
            "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;'>"
            + "".join(cards) +
            "</div>"
        )
    except:
        return ""


# ===============================
# GOOGLE MAP
# ===============================
def google_map_iframe(county: str, query: str):
    q = f"{query} {county} Ireland"
    src = f"https://www.google.com/maps?q={requests.utils.quote(q)}&output=embed"
    return f"""
    <div style="width:100%;height:420px;border-radius:10px;overflow:hidden;">
        <iframe src="{src}" width="100%" height="100%" style="border:0;"></iframe>
    </div>
    """


# ===============================
# MAIN ANSWER
# ===============================
def answer(county, question, mode):
    question = (question or "").strip()
    if not question:
        return "Please type a question.", "", "", ""

    n = 10 if mode == "detailed" else 6
    q = f"{question} {county} Ireland"

    snippets, links = google_search(q, n=n)
    if not snippets:
        snippets = wiki_fallback(county, question)

    if not snippets:
        return "No results available right now.", "", "", ""

    system_prompt, user_prompt = build_prompt(county, question, snippets, mode)
    max_tokens = 700 if mode == "detailed" else 350
    text = llm_generate(system_prompt, user_prompt, max_tokens=max_tokens)

    src_md = ""
    if links:
        src_md = "### Sources\n" + "\n".join([f"- [{t}]({u})" for t, u in links[:3]])

    images = unsplash_images_html(county, question)
    maps = google_map_iframe(county, question)

    return text, src_md, images, maps


# ===============================
# CLEAN UI
# ===============================
def build_ui():
    with gr.Blocks(title="Travelpia") as demo:
        gr.Markdown("## Travelpia")

        with gr.Row():
            county = gr.Dropdown(COUNTIES, value="Galway", label="County")
            mode = gr.Radio(["fast", "detailed"], value="fast", label="Mode")

        question = gr.Textbox(label="Your question", lines=2)

        button = gr.Button("Ask Travelpia")

        answer_box = gr.Textbox(label="Answer", lines=6)
        sources_md = gr.Markdown()
        photos_html = gr.HTML()
        map_html = gr.HTML()

        button.click(answer, [county, question, mode], [answer_box, sources_md, photos_html, map_html])

    return demo


demo = build_ui()

if __name__ == "__main__":
    demo.launch()
