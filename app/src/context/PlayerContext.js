import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { Alert } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const [queue, setQueue] = useState([]); // array of { id, title, uploader, thumbnailUrl, source }
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [repeatMode, setRepeatMode] = useState('off'); // off | one | all
  const advancingRef = useRef(false);
  const loadTokenRef = useRef(0);

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
  // file) when it carries `headers`, so for those we HEAD-check the URL
  // first and surface a real error instead of a dead spinner.
  const loadTrack = useCallback(
    async (tracks, index, autoplay = true) => {
      const track = tracks[index];
      if (!track) return;
      const token = ++loadTokenRef.current;
      setCurrentIndex(index);

      if (track.source?.headers) {
        try {
          const res = await fetch(track.source.uri, { method: 'HEAD', headers: track.source.headers });
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
