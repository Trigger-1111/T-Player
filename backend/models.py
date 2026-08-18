from typing import Optional

from pydantic import BaseModel


class SearchResult(BaseModel):
    id: str
    title: str
    uploader: Optional[str] = None
    duration: Optional[int] = None
    thumbnail_url: Optional[str] = None


class DownloadRequest(BaseModel):
    url: str  # full YouTube URL or bare video id


class Track(BaseModel):
    id: str
    title: str
    uploader: Optional[str] = None
    duration: Optional[int] = None
    thumbnail_url: Optional[str] = None
    filename: Optional[str] = None
    filesize: Optional[int] = None
    status: str
    progress: float
    error: Optional[str] = None
    created_at: str


class PlaylistCreate(BaseModel):
    name: str


class Playlist(BaseModel):
    id: str
    name: str
    created_at: str
    track_ids: list[str] = []


class PlaylistAddTrack(BaseModel):
    track_id: str


class PlaylistReorder(BaseModel):
    track_ids: list[str]
