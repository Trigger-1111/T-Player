"""yt-dlp powered search + download helpers.

Downloads are for personal, offline use in the user's own music player app.

YouTube now requires a "GVS PO Token" (proof-of-origin) plus a JS challenge
solve for almost every downloadable format - without them, format resolution
either comes back empty or the actual media request 403s even though the
video's metadata loads fine. Two extra pieces make that work here:
  1. A Deno runtime (yt-dlp's JS challenge solver) - installed to
     ~/.deno/bin/deno, not on PATH, so it's referenced by absolute path.
  2. The bgutil-ytdlp-pot-provider local HTTP server (see
     backend/bgutil-ytdlp-pot-provider/) running on 127.0.0.1:4416, which
     mints the PO token. It must be running for downloads to succeed - yt-dlp
     degrades to a plain (401/403-prone) request without it, it doesn't hard
     fail at startup.
Audio-only formats aren't served to the client we use (web_safari) even with
a valid token, so we grab the smallest muxed video+audio format and let
ffmpeg discard the video track during mp3 extraction.
"""
import os
import uuid
from pathlib import Path

import yt_dlp

from config import MEDIA_DIR, THUMBNAIL_DIR
from db import get_conn, now
from models import SearchResult

DENO_PATH = str(Path.home() / ".deno" / "bin" / "deno")

_YOUTUBE_AUTH_OPTS = {
    "js_runtimes": {"deno": {"path": DENO_PATH}},
    "remote_components": ["ejs:github"],
    "extractor_args": {"youtube": {"player_client": ["web_safari"]}},
}


def search(query: str, limit: int = 15) -> list[SearchResult]:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "default_search": f"ytsearch{limit}",
        "noplaylist": True,
        **_YOUTUBE_AUTH_OPTS,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(query, download=False)
        entries = info.get("entries", []) if info else []

    results = []
    for e in entries:
        if not e:
            continue
        thumb = None
        thumbs = e.get("thumbnails") or []
        if thumbs:
            thumb = thumbs[-1].get("url")
        elif e.get("thumbnail"):
            thumb = e.get("thumbnail")
        results.append(
            SearchResult(
                id=e.get("id"),
                title=e.get("title") or "Untitled",
                uploader=e.get("uploader") or e.get("channel"),
                duration=e.get("duration"),
                thumbnail_url=thumb,
            )
        )
    return results


def _set_status(track_id: str, **fields):
    if not fields:
        return
    cols = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [track_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE tracks SET {cols} WHERE id = ?", values)


def upsert_pending_track(video_id: str, title: str, uploader: str | None,
                          duration: int | None, thumbnail_url: str | None):
    with get_conn() as conn:
        existing = conn.execute("SELECT id FROM tracks WHERE id = ?", (video_id,)).fetchone()
        if existing:
            return
        conn.execute(
            """INSERT INTO tracks (id, title, uploader, duration, thumbnail_url,
                                    status, progress, created_at)
               VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)""",
            (video_id, title, uploader, duration, thumbnail_url, now()),
        )


def run_download(video_id: str, url_or_id: str):
    """Runs synchronously - intended to be called from a FastAPI BackgroundTask
    (Starlette executes sync background tasks in a worker thread)."""
    _set_status(video_id, status="downloading", progress=0, error=None)

    out_template = str(MEDIA_DIR / f"{video_id}.%(ext)s")

    def hook(d):
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0)
            pct = (downloaded / total * 100) if total else 0
            _set_status(video_id, progress=round(pct, 1))
        elif d.get("status") == "error":
            _set_status(video_id, status="failed", error="download error")

    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        # No audio-only formats are offered for this client even with a
        # valid PO token, so take the smallest muxed format that has audio
        # and let ffmpeg strip the video track below.
        "format": "worst[acodec!=none]/bestaudio/best",
        "outtmpl": out_template,
        "progress_hooks": [hook],
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        **_YOUTUBE_AUTH_OPTS,
    }

    query = url_or_id if url_or_id.startswith("http") else url_or_id

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(query, download=True)

        mp3_path = MEDIA_DIR / f"{video_id}.mp3"
        if not mp3_path.exists():
            raise RuntimeError("expected mp3 output not found after download")

        filesize = os.path.getsize(mp3_path)
        title = info.get("title") or "Untitled"
        uploader = info.get("uploader") or info.get("channel")
        duration = info.get("duration")
        thumbs = info.get("thumbnails") or []
        thumbnail_url = thumbs[-1].get("url") if thumbs else info.get("thumbnail")

        _set_status(
            video_id,
            status="ready",
            progress=100,
            filename=f"{video_id}.mp3",
            filesize=filesize,
            title=title,
            uploader=uploader,
            duration=duration,
            thumbnail_url=thumbnail_url,
            error=None,
        )
    except Exception as exc:  # noqa: BLE001
        _set_status(video_id, status="failed", error=str(exc)[:500])


def extract_video_id(url_or_id: str) -> str:
    """Best-effort extraction of a stable id to use as the track's primary key
    without doing a full network fetch. Falls back to a random id for plain
    search queries (shouldn't happen - download endpoint expects a URL/id)."""
    if "youtu.be/" in url_or_id:
        return url_or_id.split("youtu.be/")[1].split("?")[0].split("&")[0]
    if "watch?v=" in url_or_id:
        tail = url_or_id.split("watch?v=")[1]
        return tail.split("&")[0]
    if len(url_or_id) == 11 and " " not in url_or_id:
        return url_or_id
    return uuid.uuid4().hex[:11]
