function normalizeBase(url) {
  return url.replace(/\/+$/, '');
}

export function createApiClient(serverUrl, apiKey) {
  const base = normalizeBase(serverUrl || '');

  async function request(path, options = {}) {
    if (!base) throw new Error('서버 주소가 설정되지 않았습니다. 설정 화면에서 입력해주세요.');
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'X-API-Key': apiKey || '',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail || detail;
      } catch {
        // ignore
      }
      throw new Error(`${res.status}: ${detail}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  return {
    health: () => request('/api/health'),
    search: (q, limit = 15) => request(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
    download: (url) => request('/api/download', { method: 'POST', body: JSON.stringify({ url }) }),
    listTracks: () => request('/api/tracks'),
    trackStatus: (id) => request(`/api/tracks/${id}/status`),
    deleteTrack: (id) => request(`/api/tracks/${id}`, { method: 'DELETE' }),
    trackFileUrl: (id) => `${base}/api/tracks/${id}/file`,
    authHeaders: () => ({ 'X-API-Key': apiKey || '' }),
    listPlaylists: () => request('/api/playlists'),
    createPlaylist: (name) => request('/api/playlists', { method: 'POST', body: JSON.stringify({ name }) }),
    deletePlaylist: (id) => request(`/api/playlists/${id}`, { method: 'DELETE' }),
    addTrackToPlaylist: (playlistId, trackId) =>
      request(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ track_id: trackId }),
      }),
    removeTrackFromPlaylist: (playlistId, trackId) =>
      request(`/api/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' }),
    reorderPlaylist: (playlistId, trackIds) =>
      request(`/api/playlists/${playlistId}/order`, {
        method: 'PUT',
        body: JSON.stringify({ track_ids: trackIds }),
      }),
  };
}
