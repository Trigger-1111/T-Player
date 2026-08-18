import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)

MEDIA_DIR = BASE_DIR / "media"
THUMBNAIL_DIR = BASE_DIR / "thumbnails"
DB_PATH = BASE_DIR / "library.db"

MEDIA_DIR.mkdir(exist_ok=True)
THUMBNAIL_DIR.mkdir(exist_ok=True)

PORT = int(os.environ.get("PORT", "8000"))


def _ensure_api_key() -> str:
    key = os.environ.get("API_KEY")
    if key:
        return key
    key = secrets.token_hex(16)
    with open(ENV_PATH, "a") as f:
        f.write(f"API_KEY={key}\n")
    os.environ["API_KEY"] = key
    print(f"[config] Generated new API_KEY and saved to {ENV_PATH}: {key}")
    return key


API_KEY = _ensure_api_key()
