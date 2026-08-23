import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

// Rendered by the screen itself (not react-navigation's header option) on
// purpose: React Navigation renders a JS header for plain Tab.Screens but a
// real *native* header for screens that live inside a nested Stack.Navigator
// (Playlists does, for the push-to-detail transition) - two different
// rendering paths with their own padding/height quirks, which is exactly
// why the brand mark sat a few pixels off between tabs. One shared
// component with the same styles every time removes that variable entirely.
export default function BrandHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>T-Player</Text>
    </View>
  );
}

const HEADER_HEIGHT = 48;

export const BRAND_HEADER_HEIGHT = HEADER_HEIGHT;

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  title: { color: colors.primary, fontFamily: fonts.extraBold, fontSize: 18, letterSpacing: 0.3 },
});
