import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const PlayerContext = createContext(null);
const STORAGE_KEY = 't-player:player-state';

export function PlayerProvider({ children }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const [queue, setQueue] = useState([]); // array of { id, title, uploader, thumbnailUrl, source }
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [repeatMode, setRepeatMode] = useState('off'); // off | one | all
  const advancingRef = useRef(false);
  const loadTokenRef = useRef(0);
  // Real music players (Spotify, Deezer, ...) keep the queue across a force
  // quit / OS kill and resume paused where you left off - losing the queue
  // on restart is a commonly reported complaint. Restore once on mount...
  const restoredRef = useRef(false);
  // ...then seek to the saved position once the restored track has loaded
  // (seeking before the player reports isLoaded is a no-op).
  const pendingSeekRef = useRef(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    }).catch(() => {});
  }, []);

  // Shared by both "play within the current queue" and "start a brand new
  // queue" call sites so there's one place that loads a track into the
  // native player. Takes `tracks` explicitly rather than reading `queue`
  // from closure so callers starting a fresh queue don't race a stale value.
  //
  // expo-audio's playback status has no `error` field, so a bad stream URL
  // (server offline, expired API key, dropped network) fails *silently* -
  // isLoaded just never becomes true and nothing plays or is reported to the
  // user. We only know the source is a remote stream (vs. a local downloaded
  // file) when it carries `headers`, so for those we sanity-check the URL
  // first and surface a real error instead of a dead spinner. A ranged GET
  // (not HEAD) - the backend's file/preview endpoints only implement GET,
  // and media servers in general are far more reliably tested with a tiny
  // real request than a HEAD they may not support at all.
  const loadTrack = useCallback(
    async (tracks, index, autoplay = true) => {
      const track = tracks[index];
      if (!track) return;
      const token = ++loadTokenRef.current;
      setCurrentIndex(index);
      // The UI (title/artist) switches to the new track immediately via
      // setCurrentIndex above, but for a streamed track the actual audio
      // swap waits on the preflight check below - without pausing here
      // first, the *previous* track kept audibly playing for that whole
      // stretch while the screen already showed the new one.
      player.pause();

      if (track.source?.headers) {
        try {
          const res = await fetch(track.source.uri, {
            headers: { ...track.source.headers, Range: 'bytes=0-1' },
          });
          if (!res.ok) throw new Error(`서버 응답 ${res.status}`);
        } catch (err) {
          if (token !== loadTokenRef.current) return; // superseded by a newer load
          Alert.alert('재생 실패', `"${track.title}" 스트리밍에 실패했습니다.\n${err.message}`);
          return;
        }
        if (token !== loadTokenRef.current) return; // user moved on while we were checking
      }

      player.replace(track.source);
      if (autoplay) player.play();
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.uploader || undefined,
        artwork: track.thumbnailUrl || undefined,
      });
    },
    [player]
  );

  // Restore the last queue/track/position on launch. Resumes paused (not
  // autoplaying) - mirrors how Spotify/Apple Music come back after a kill.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved.queue?.length || saved.currentIndex < 0) return;
        setQueue(saved.queue);
        setRepeatMode(saved.repeatMode || 'off');
        pendingSeekRef.current = saved.positionSeconds || 0;
        await loadTrack(saved.queue, saved.currentIndex, false);
      } catch {
        // corrupt or missing state - just start empty
      } finally {
        restoredRef.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingSeekRef.current != null && status.isLoaded) {
      player.seekTo(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
  }, [status.isLoaded, player]);

  // Persist queue/current track/repeat mode whenever they change.
  useEffect(() => {
    if (!restoredRef.current) return; // don't overwrite storage while still restoring
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ queue, currentIndex, repeatMode, positionSeconds: Math.floor(status.currentTime || 0) })
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex, repeatMode]);

  // Periodically checkpoint playback position while playing, so a force-kill
  // mid-track resumes close to where it left off rather than from 0:00.
  useEffect(() => {
    if (!status.playing) return;
    const id = setInterval(() => {
      AsyncStorage.mergeItem(
        STORAGE_KEY,
        JSON.stringify({ positionSeconds: Math.floor(status.currentTime || 0) })
      ).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [status.playing]);

  const loadIndex = useCallback((index, autoplay = true) => loadTrack(queue, index, autoplay), [queue, loadTrack]);

  const playQueue = useCallback(
    (tracks, startIndex = 0) => {
      setQueue(tracks);
      loadTrack(tracks, startIndex);
    },
    [loadTrack]
  );

  const playPause = useCallback(() => {
    if (status.playing) player.pause();
    else player.play();
  }, [player, status.playing]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') nextIndex = 0;
      else return;
    }
    loadIndex(nextIndex);
  }, [queue, currentIndex, repeatMode, loadIndex]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    if (status.currentTime > 3) {
      player.seekTo(0);
      return;
    }
    const prevIndex = Math.max(0, currentIndex - 1);
    loadIndex(prevIndex);
  }, [queue, currentIndex, status.currentTime, player, loadIndex]);

  const seekTo = useCallback((seconds) => player.seekTo(seconds), [player]);

  const addToQueueAndPlayIfEmpty = useCallback(
    (track) => {
      setQueue((prev) => {
        const next = [...prev, track];
        if (prev.length === 0) loadTrack(next, 0);
        return next;
      });
    },
    [loadTrack]
  );

  // auto-advance when a track finishes
  useEffect(() => {
    if (!status.didJustFinish || advancingRef.current) return;
    advancingRef.current = true;
    if (repeatMode === 'one') {
      player.seekTo(0);
      player.play();
    } else {
      next();
    }
    setTimeout(() => {
      advancingRef.current = false;
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'));
  }, []);

  const value = {
    queue,
    currentIndex,
    currentTrack: currentIndex >= 0 ? queue[currentIndex] : null,
    status,
    repeatMode,
    playQueue,
    playPause,
    next,
    prev,
    seekTo,
    cycleRepeat,
    addToQueueAndPlayIfEmpty,
    playTrackAt: loadIndex,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
