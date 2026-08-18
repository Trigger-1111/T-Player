// Font family tokens. Loaded once in App.js via useFonts(); every screen
// references these names instead of leaving fontFamily unset (which falls
// back to the OS default system font - the "too generic" look).
//
// Noto Sans KR (not a Latin-only display font) - this app's UI copy is
// almost entirely Korean, so the font has to carry full Hangul coverage.
export const fonts = {
  regular: 'NotoSansKR_400Regular',
  medium: 'NotoSansKR_500Medium',
  semiBold: 'NotoSansKR_600SemiBold',
  bold: 'NotoSansKR_700Bold',
  extraBold: 'NotoSansKR_800ExtraBold',
};
