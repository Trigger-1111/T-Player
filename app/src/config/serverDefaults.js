// Baked-in defaults so the app works out of the box without visiting the
// Settings screen. Sourced from EXPO_PUBLIC_* env vars (Expo inlines these
// into the bundle at build time) rather than a gitignored local file - the
// local-file approach broke EAS Build entirely, since a file that's
// deliberately excluded from git doesn't exist on the build server either,
// and Metro can't resolve a missing import (unlike a runtime env var, which
// is just absent/undefined if unset).
//
// For local dev, put the real values in app/.env (gitignored, see
// app/.env.example) - `expo start` loads it automatically. For EAS builds,
// they're set as project environment variables (`eas env:set`) instead.
//
// The Settings screen can still override these; once the user saves a value
// there, the override is persisted in AsyncStorage and takes precedence over
// these defaults on every subsequent launch.
export const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_DEFAULT_SERVER_URL || '';
export const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_DEFAULT_API_KEY || '';
