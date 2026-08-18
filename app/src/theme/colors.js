// Single source of truth for the app's color scheme: white + red, with a
// warm neutral scale and a near-black contrast surface mixed in so the UI
// doesn't read as flat white-on-white.
export const colors = {
  bg: '#FFFCFB', // barely-warm white, not clinical pure white
  surface: '#F6EFEC', // input fields, rows, cards - warm light neutral
  surfaceAlt: '#EDE1DC', // pressed states, thumb placeholders
  border: '#E8DBD5',

  ink: '#17130F', // near-black w/ a hair of warmth - big contrast blocks (mini player, sheets)
  inkAlt: '#241C17',

  text: '#1C1712',
  textSecondary: '#7A6F68',
  textMuted: '#A79C94',
  placeholder: '#B3A8A0',

  primary: '#E11D2E', // red - buttons, active tab, progress, links
  primaryPressed: '#B71424',
  primaryTint: '#FBE4E4', // pale red wash for badges/selected rows
  onPrimary: '#FFFFFF',

  accent: '#F2A93C', // warm gold - secondary accent for badges/highlights only
  onInk: '#FFFDFB',

  destructive: '#B3261E',
};
