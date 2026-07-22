"""
Groq-powered chatbot backend.

Endpoints:
    GET  /api/health   -> simple healthcheck
    POST /api/chat     -> send a message (+ optional file) and get a reply

Run:
    uvicorn main:app --reload --port 8000
"""

import base64
import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq

from agents.agent import run_agent
from utils.file_parser import extract_text_from_file, is_image

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
TEXT_MODEL = os.environ.get("GROQ_TEXT_MODEL", "openai/gpt-oss-20b")
VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "qwen/qwen3.6-27b")
AGENT_MODEL = os.environ.get("GROQ_AGENT_MODEL", "openai/gpt-oss-20b")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set. Copy .env.example to .env and add your key.")

client = Groq(api_key=GROQ_API_KEY)

app = FastAPI(title="Groq Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = (
    "You are a helpful, friendly AI assistant. When the user attaches a document, "
    "its extracted text will appear after their message inside a clearly marked block — "
    "use it to answer their question. When an image is attached, look at it carefully "
    "before responding."
)

AGENT_SYSTEM_PROMPT = (
    "You are a helpful AI agent with tools: calculator, web_search, and "
    "get_current_datetime. Use a tool whenever it would make your answer more "
    "accurate (math, current events, anything after your training data, or "
    "anything you're unsure about) instead of guessing. After tool results come "
    "back, give a clear final answer in plain language — don't just dump raw "
    "tool output."
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "text_model": TEXT_MODEL,
        "vision_model": VISION_MODEL,
        "agent_model": AGENT_MODEL,
    }


@app.post("/api/chat")
async def chat(
    message: str = Form(""),
    history: str = Form("[]"),
    agent_mode: bool = Form(False),
    file: UploadFile | None = File(None),
):
    """
    message    : the user's typed text
    history    : JSON-encoded list of prior {role, content} messages (content must be
                 plain strings for history — image messages aren't replayed as images)
    agent_mode : if true (and no image attached), route through the tool-calling agent
                 (web_search / calculator / get_current_datetime)
    file       : optional upload (image OR document)
    """
    try:
        prior_messages = json.loads(history)
        if not isinstance(prior_messages, list):
            prior_messages = []
    except json.JSONDecodeError:
        prior_messages = []

    # Free-tier TPM budgets are small — only keep the last few turns, and cap
    # how long any single past message can be, so old file dumps don't linger.
    MAX_HISTORY_MESSAGES = 8
    MAX_HISTORY_MSG_CHARS = 2000
    prior_messages = prior_messages[-MAX_HISTORY_MESSAGES:]
    for m in prior_messages:
        if isinstance(m.get("content"), str) and len(m["content"]) > MAX_HISTORY_MSG_CHARS:
            m["content"] = m["content"][:MAX_HISTORY_MSG_CHARS] + " [...truncated...]"

    attached_note = None
    image_data_url = None

    if file is not None:
        file_bytes = await file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 10MB).")

        if is_image(file.filename, file.content_type):
            mime = file.content_type or "image/png"
            b64 = base64.b64encode(file_bytes).decode("utf-8")
            image_data_url = f"data:{mime};base64,{b64}"
        else:
            extracted = extract_text_from_file(file.filename, file_bytes)
            attached_note = f"\n\n--- Attached document: {file.filename} ---\n{extracted}\n--- end of document ---"

    user_text = (message or "").strip()
    if attached_note:
        user_text = f"{user_text}\n{attached_note}" if user_text else attached_note.strip()
    if not user_text and not image_data_url:
        raise HTTPException(status_code=400, detail="Send a message or a file.")

    use_agent = agent_mode and image_data_url is None

    if image_data_url:
        user_message = {
            "role": "user",
            "content": [
                {"type": "text", "text": user_text or "Describe this image."},
                {"type": "image_url", "image_url": {"url": image_data_url}},
            ],
        }
        model = VISION_MODEL
    else:
        user_message = {"role": "user", "content": user_text}
        model = AGENT_MODEL if use_agent else TEXT_MODEL

    system_prompt = AGENT_SYSTEM_PROMPT if use_agent else SYSTEM_PROMPT
    messages = [{"role": "system", "content": system_prompt}, *prior_messages, user_message]

    try:
        if use_agent:
            result = run_agent(client, model, messages)
            reply = result["reply"]
            tool_calls = result["tool_calls"]
        else:
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            reply = completion.choices[0].message.content
            tool_calls = []
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    return JSONResponse({"reply": reply, "model": model, "tool_calls": tool_calls})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)