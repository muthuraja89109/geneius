"""
Helpers for handling uploaded files:
- detect whether an upload is an image (goes to the vision model)
- extract plain text from documents (goes into the prompt as context)
"""

import io

from pypdf import PdfReader
import docx

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".log"}

MAX_CHARS = 6000  # keep prompts from getting too large (free-tier TPM limits are small)


def is_image(filename: str, content_type: str | None) -> bool:
    if content_type and content_type.startswith("image/"):
        return True
    if filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
        return ext in IMAGE_EXTENSIONS
    return False


def extract_text_from_file(filename: str, file_bytes: bytes) -> str:
    """Return best-effort plain text extracted from a document upload."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    try:
        if ext == ".pdf":
            reader = PdfReader(io.BytesIO(file_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n\n".join(pages).strip()
            if not text:
                text = "[No selectable text found in this PDF — it may be a scanned image.]"

        elif ext == ".docx":
            document = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join(p.text for p in document.paragraphs).strip()

        elif ext in TEXT_EXTENSIONS:
            text = file_bytes.decode("utf-8", errors="ignore")

        else:
            text = f"[Unsupported file type '{ext}'. Supported: pdf, docx, txt, md, csv, json, images.]"

    except Exception as exc:  # noqa: BLE001
        text = f"[Could not read '{filename}': {exc}]"

    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "\n\n[...truncated...]"

    return text