import uuid

import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

import downloader
from config import API_KEY, MEDIA_DIR, THUMBNAIL_DIR
from db import get_conn, init_db, now
from models import (
    DownloadRequest,
    Playlist,
    PlaylistAddTrack,
    PlaylistCreate,
    PlaylistReorder,
    SearchResult,
    Track,
)

app = FastAPI(title="YT Music Downloader")

init_db()


def require_api_key(x_api_key: str | None = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="invalid or missing X-API-Key")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------- search ---
@app.get("/api/search", response_model=list[SearchResult], dependencies=[Depends(require_api_key)])
def api_search(q: str, limit: int = 15):
    try:
        return downloader.search(q, limit=limit)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"search failed: {exc}") from exc


# --------------------------------------------------------------- preview ---
# Live-streams a track straight from YouTube without saving anything, so the
# app can let you listen before deciding to keep it. The resolved YouTube
# CDN URL is locked to this server's IP, so we fetch it here and relay the
# bytes rather than handing the URL to the phone (which would 403 from any
# other network).
#
# The android_vr fallback format (see downloader.py's docstring) only ever
# serves ~1,000,000 bytes starting from byte 0 of a given URL - confirmed by
# hand, a non-zero start 403s even on a freshly re-resolved URL, so there's
# no way to fetch further into the file once that budget is spent. We can't
# do anything about that past the cap, but we can make hitting it look like
# a clean end-of-stream instead of a playback error: the first request
# (start=0) always forwards a capped window and surfaces a real error if
# even that fails, while a later request landing past the cap gets 416
# (Range Not Satisfiable) instead of propagating the upstream 403 - most
# players treat that as "you've reached the end" rather than a hard failure.
_PREVIEW_CHUNK_BYTES = 1_000_000


def _range_start(range_header: str | None) -> int:
    if not range_header:
        return 0
    try:
        start = range_header.split("=", 1)[1].split("-", 1)[0]
        return int(start) if start else 0
    except (IndexError, ValueError):
        return 0


@app.get("/api/preview/{video_id}", dependencies=[Depends(require_api_key)])
async def api_preview(video_id: str, request: Request):
    try:
        url, upstream_headers = await run_in_threadpool(downloader.resolve_preview, video_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"preview resolve failed: {exc}") from exc

    start = _range_start(request.headers.get("range"))
    fwd_headers = {**upstream_headers, "Range": f"bytes={start}-{start + _PREVIEW_CHUNK_BYTES - 1}"}

    client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
    try:
        upstream_req = client.build_request("GET", url, headers=fwd_headers)
        upstream = await client.send(upstream_req, stream=True)
    except Exception as exc:  # noqa: BLE001
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"preview fetch failed: {exc}") from exc

    if upstream.status_code >= 400:
        await upstream.aclose()
        await client.aclose()
        if start > 0:
            # Likely the ~1MB cap, not a real error - see comment above.
            raise HTTPException(status_code=416, detail="no more preview data available")
        raise HTTPException(status_code=502, detail=f"upstream returned {upstream.status_code}")

    async def relay():
        try:
            async for chunk in upstream.aiter_bytes():
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    passthrough_headers = {
        k: upstream.headers[k]
        for k in ("content-length", "content-range", "accept-ranges")
        if k in upstream.headers
    }
    return StreamingResponse(
        relay(),
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type", "audio/mp4"),
        headers=passthrough_headers,
    )


# -------------------------------------------------------------- download ---
@app.post("/api/download", response_model=Track, dependencies=[Depends(require_api_key)])
def api_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    video_id = downloader.extract_video_id(req.url)

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM tracks WHERE id = ?", (video_id,)).fetchone()

    if row and row["status"] in ("ready", "downloading"):
        return Track(**dict(row))

    if not row:
        downloader.upsert_pending_track(video_id, title="(fetching info…)", uploader=None,
                                         duration=None, thumbnail_url=None)

    background_tasks.add_task(downloader.run_download, video_id, req.url)

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM tracks WHERE id = ?", (video_id,)).fetchone()
    return Track(**dict(row))


@app.get("/api/tracks", response_model=list[Track], dependencies=[Depends(require_api_key)])
def api_list_tracks():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM tracks ORDER BY created_at DESC").fetchall()
    return [Track(**dict(r)) for r in rows]


@app.get("/api/tracks/{track_id}/status", response_model=Track, dependencies=[Depends(require_api_key)])
def api_track_status(track_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="track not found")
    return Track(**dict(row))


@app.get("/api/tracks/{track_id}/file", dependencies=[Depends(require_api_key)])
def api_track_file(track_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
    if not row or row["status"] != "ready" or not row["filename"]:
        raise HTTPException(status_code=404, detail="track file not ready")
    path = MEDIA_DIR / row["filename"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="file missing on disk")
    return FileResponse(path, media_type="audio/mpeg", filename=row["filename"])


@app.delete("/api/tracks/{track_id}", dependencies=[Depends(require_api_key)])
def api_delete_track(track_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="track not found")
        if row["filename"]:
            path = MEDIA_DIR / row["filename"]
            if path.exists():
                path.unlink()
        conn.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
    return {"deleted": track_id}


# ------------------------------------------------------------- playlists ---
def _playlist_with_tracks(conn, playlist_id: str) -> Playlist | None:
    row = conn.execute("SELECT * FROM playlists WHERE id = ?", (playlist_id,)).fetchone()
    if not row:
        return None
    track_rows = conn.execute(
        "SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position",
        (playlist_id,),
    ).fetchall()
    return Playlist(**dict(row), track_ids=[r["track_id"] for r in track_rows])


@app.get("/api/playlists", response_model=list[Playlist], dependencies=[Depends(require_api_key)])
def api_list_playlists():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM playlists ORDER BY created_at DESC").fetchall()
        return [_playlist_with_tracks(conn, r["id"]) for r in rows]


@app.post("/api/playlists", response_model=Playlist, dependencies=[Depends(require_api_key)])
def api_create_playlist(body: PlaylistCreate):
    pid = uuid.uuid4().hex
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)",
            (pid, body.name, now()),
        )
        return _playlist_with_tracks(conn, pid)


@app.delete("/api/playlists/{playlist_id}", dependencies=[Depends(require_api_key)])
def api_delete_playlist(playlist_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM playlists WHERE id = ?", (playlist_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="playlist not found")
        conn.execute("DELETE FROM playlists WHERE id = ?", (playlist_id,))
    return {"deleted": playlist_id}


@app.post("/api/playlists/{playlist_id}/tracks", response_model=Playlist, dependencies=[Depends(require_api_key)])
def api_add_track_to_playlist(playlist_id: str, body: PlaylistAddTrack):
    with get_conn() as conn:
        playlist = conn.execute("SELECT id FROM playlists WHERE id = ?", (playlist_id,)).fetchone()
        if not playlist:
            raise HTTPException(status_code=404, detail="playlist not found")
        track = conn.execute("SELECT id FROM tracks WHERE id = ?", (body.track_id,)).fetchone()
        if not track:
            raise HTTPException(status_code=404, detail="track not found")
        pos_row = conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM playlist_tracks WHERE playlist_id = ?",
            (playlist_id,),
        ).fetchone()
        conn.execute(
            "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
            (playlist_id, body.track_id, pos_row["next_pos"]),
        )
        return _playlist_with_tracks(conn, playlist_id)


@app.delete("/api/playlists/{playlist_id}/tracks/{track_id}", response_model=Playlist, dependencies=[Depends(require_api_key)])
def api_remove_track_from_playlist(playlist_id: str, track_id: str):
    with get_conn() as conn:
        playlist = conn.execute("SELECT id FROM playlists WHERE id = ?", (playlist_id,)).fetchone()
        if not playlist:
            raise HTTPException(status_code=404, detail="playlist not found")
        conn.execute(
            "DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?",
            (playlist_id, track_id),
        )
        return _playlist_with_tracks(conn, playlist_id)


@app.put("/api/playlists/{playlist_id}/order", response_model=Playlist, dependencies=[Depends(require_api_key)])
def api_reorder_playlist(playlist_id: str, body: PlaylistReorder):
    with get_conn() as conn:
        playlist = conn.execute("SELECT id FROM playlists WHERE id = ?", (playlist_id,)).fetchone()
        if not playlist:
            raise HTTPException(status_code=404, detail="playlist not found")
        for idx, track_id in enumerate(body.track_ids):
            conn.execute(
                "UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?",
                (idx, playlist_id, track_id),
            )
        return _playlist_with_tracks(conn, playlist_id)


# Static thumbnail cache dir (populated lazily if we ever proxy-cache thumbnails)
app.mount("/thumbnails", StaticFiles(directory=str(THUMBNAIL_DIR)), name="thumbnails")
