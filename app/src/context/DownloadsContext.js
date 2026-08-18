import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const DownloadsContext = createContext(null);
const STORAGE_KEY = 't-player:local-downloads';

function tracksDir() {
  const dir = new Directory(Paths.document, 'tracks');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function DownloadsProvider({ children }) {
  // map: trackId -> { uri, downloadedAt }
  const [downloads, setDownloads] = useState({});
  const [progress, setProgress] = useState({}); // trackId -> 0..1 while downloading

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setDownloads(JSON.parse(raw));
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setDownloads(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const downloadTrack = useCallback(
    async (trackId, remoteUrl, headers) => {
      setProgress((p) => ({ ...p, [trackId]: 0 }));
      try {
        const dest = new File(tracksDir(), `${trackId}.mp3`);
        // idempotent: true — allow retrying a download that left a partial/stale
        // file at the destination (e.g. after a dropped connection) instead of
        // permanently failing with DestinationAlreadyExists.
        const file = await File.downloadFileAsync(remoteUrl, dest, { headers, idempotent: true });
        setDownloads((prev) => {
          const next = { ...prev, [trackId]: { uri: file.uri, downloadedAt: Date.now() } };
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      } finally {
        setProgress((p) => {
          const { [trackId]: _drop, ...rest } = p;
          return rest;
        });
      }
    },
    []
  );

  const removeLocalTrack = useCallback(
    async (trackId) => {
      const entry = downloads[trackId];
      if (entry) {
        try {
          new File(entry.uri).delete();
        } catch {
          // already gone
        }
      }
      const { [trackId]: _drop, ...rest } = downloads;
      await persist(rest);
    },
    [downloads, persist]
  );

  const isDownloaded = useCallback((trackId) => Boolean(downloads[trackId]), [downloads]);
  const getLocalUri = useCallback((trackId) => downloads[trackId]?.uri, [downloads]);

  return (
    <DownloadsContext.Provider
      value={{ downloads, progress, downloadTrack, removeLocalTrack, isDownloaded, getLocalUri }}
    >
      {children}
    </DownloadsContext.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadsProvider');
  return ctx;
}
