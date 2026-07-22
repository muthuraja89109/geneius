# Groq Chat — a ChatGPT/Claude-style chatbot (React + Python)

A full-stack AI chatbot: type messages, attach **images** (visual Q&A) or
**documents** (PDF / DOCX / TXT — the content is read and used as context),
and get answers from **Groq's** ultra-fast LLM API.

```
groq-chatbot/
├── backend/                    Python (FastAPI)
│   ├── main.py                 API server — /api/chat, /api/health
│   ├── agents/
│   │   ├── tools.py            Tool definitions: calculator, web_search, get_current_datetime
│   │   └── agent.py            Tool-calling loop that drives Groq's function calling
│   ├── utils/
│   │   └── file_parser.py      Extracts text from PDF/DOCX/TXT, detects images
│   ├── requirements.txt
│   └── .env.example            Copy to .env and add your GROQ_API_KEY
│
├── frontend/                   React (Vite)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             App state, calls the backend
│       ├── App.css
│       ├── index.css           Design tokens (colors/fonts)
│       └── components/
│           ├── Sidebar.jsx
│           ├── ChatMessage.jsx
│           └── ChatInput.jsx   Text box + 📎 attach button
│
└── README.md                   You are here
```

## How it works

1. The React app posts each message as `multipart/form-data` to
   `POST /api/chat`: the typed text, the running conversation history (as
   JSON), and an optional file.
2. The FastAPI backend looks at the file:
   - **Image** (`png/jpg/webp/gif`) → base64-encoded and sent straight to a
     Groq **vision** model alongside your text.
   - **Document** (`pdf/docx/txt/md/csv/json`) → text is extracted with
     `pypdf` / `python-docx` and appended to your message as context, then
     sent to a Groq **text** model.
3. Groq's response comes back and is rendered in the chat as Markdown.

## Agent Mode 🤖

Click the **🤖 Agent** button next to the message box to turn on tool use.
In agent mode, the backend gives Groq three tools and lets it call them in a
loop (`backend/agents/agent.py`) before answering:

| Tool                 | What it does                                              |
|----------------------|-------------------------------------------------------------|
| `web_search`          | Live DuckDuckGo search — for current events / recent facts  |
| `calculator`          | Safe arithmetic evaluation (no `eval`, AST-based)            |
| `get_current_datetime`| Returns the current UTC date/time                            |

Each tool call the model makes is shown as a small chip above its reply so
you can see what it looked up. Agent mode only applies to text messages
(image uploads always go straight to the vision model). Add more tools by
extending `TOOLS` and `execute_tool()` in `backend/agents/tools.py`.

## 1. Get a Groq API key

Sign up free at **https://console.groq.com/keys** and create a key.

## 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and paste your GROQ_API_KEY

uvicorn main:app --reload --port 8000
```

The API is now running at `http://localhost:8000` (check `/api/health`).

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — the Vite dev server proxies `/api` calls to
the backend automatically (see `vite.config.js`).

## Configuration

Env vars in `backend/.env`:

| Variable            | Purpose                                              | Default                                     |
|---------------------|-------------------------------------------------------|----------------------------------------------|
| `GROQ_API_KEY`       | Your Groq API key (required)                          | —                                              |
| `GROQ_TEXT_MODEL`    | Model for normal text chat                            | `llama-3.3-70b-versatile`                     |
| `GROQ_VISION_MODEL`  | Model used automatically when an image is attached     | `meta-llama/llama-4-scout-17b-16e-instruct`   |
| `FRONTEND_ORIGIN`    | Allowed CORS origin                                    | `*`                                            |

> Groq periodically adds/retires models. If a model name errors out, check
> the current list at **https://console.groq.com/docs/models** and update
> your `.env`.

## Notes & next steps

- Uploads are capped at 10MB (edit the check in `backend/main.py` to change).
- Scanned/image-only PDFs won't have selectable text — you'd need an OCR step
  (e.g. `pytesseract`) to support those; the current code will tell the user
  no text was found.
- Conversation history is kept in the browser's React state only (refreshing
  the page clears it). Add a database (SQLite/Postgres) if you want persistence.
- For production, put a real domain in `FRONTEND_ORIGIN`, run the backend
  behind `gunicorn`/`uvicorn workers`, and build the frontend with
  `npm run build` (serve the `dist/` folder from any static host).
