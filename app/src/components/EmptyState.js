import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

// One shared empty-state layout so every screen's "nothing here yet"
// message sits truly centered in the content area (not just pinned near
// the top with a fixed padding), regardless of how long the body text is -
// screens were reading as inconsistent because each had its own slightly
// different spacing.
export default function EmptyState({ icon, title, body }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {!!body && <Text style={styles.body}>{body}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginTop: 4 },
  body: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
