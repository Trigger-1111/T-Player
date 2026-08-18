// Baked-in defaults so the app works out of the box without visiting the
// Settings screen. The real values live in serverDefaults.local.js, which is
// gitignored (this repo is public, and those values are this maintainer's
// actual server address + API key). See serverDefaults.local.example.js for
// the template a fresh checkout starts from — copy it to
// serverDefaults.local.js and fill in your own server's values.
//
// The Settings screen can still override these; once the user saves a value
// there, the override is persisted in AsyncStorage and takes precedence over
// these defaults on every subsequent launch.
export { DEFAULT_SERVER_URL, DEFAULT_API_KEY } from './serverDefaults.local';
