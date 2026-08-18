import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_API_KEY, DEFAULT_SERVER_URL } from '../config/serverDefaults';

const SettingsContext = createContext(null);

const STORAGE_KEY = 'dd-music:settings';

export function SettingsProvider({ children }) {
  // Start from the baked-in defaults so the app is usable immediately on a
  // fresh install. If the user previously saved a different value in
  // Settings, that overrides these once AsyncStorage finishes loading.
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setServerUrl(parsed.serverUrl || DEFAULT_SERVER_URL);
          setApiKey(parsed.apiKey || DEFAULT_API_KEY);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const save = useCallback(async (nextServerUrl, nextApiKey) => {
    setServerUrl(nextServerUrl);
    setApiKey(nextApiKey);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ serverUrl: nextServerUrl, apiKey: nextApiKey })
    );
  }, []);

  return (
    <SettingsContext.Provider value={{ serverUrl, apiKey, loaded, save }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
