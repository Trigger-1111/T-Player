// Single source of truth for the app's white + red color scheme.
// Import from here instead of hardcoding hex values in screen/component styles.
export const colors = {
  bg: '#FFFFFF',
  surface: '#F6F6F7', // input fields, rows, cards
  surfaceAlt: '#ECECEE', // modal inputs, pressed states
  border: '#E3E3E5',

  text: '#18181B',
  textSecondary: '#6B6B70',
  textMuted: '#9A9AA0',
  placeholder: '#A6A6AC',

  primary: '#E11D2E', // red - buttons, active tab, progress, links
  primaryPressed: '#C41726',
  onPrimary: '#FFFFFF',

  destructive: '#B3261E',
};
