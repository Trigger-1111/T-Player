# Expo SDK version pinned

This project is intentionally pinned to **Expo SDK 54** (not the latest SDK) to match the
maintainer's installed Expo Go client (54.0.8). `package.json` pins `"expo": "^54.0.36"`.

Read the versioned docs at https://docs.expo.dev/versions/v54.0.0/ before adding APIs.
Only use libraries/APIs that work inside Expo Go for SDK 54 — no custom native modules
that require a custom dev client build, unless the maintainer explicitly asks to move off
Expo Go.
