import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

// Groups content into a visually distinct block instead of everything
// floating directly on the screen background - used for track rows,
// playlist rows, and settings sections so the UI reads as sectioned
// "cards" rather than one flat list of text.
export default function Card({ children, style, tight }) {
  return <View style={[styles.card, tight && styles.tight, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tight: { marginBottom: 6 },
});
