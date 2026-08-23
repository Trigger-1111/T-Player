import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Flat list row (no bordered/shadowed card around it) - real music apps
// (Spotify, Apple Music, YouTube Music) rely on a large thumbnail + clear
// type hierarchy for visual rhythm, not a box around every single row.
export default function TrackRow({ track, onPress, left, right }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      {left}
      {track.thumbnail_url || track.thumbnailUrl ? (
        <Image source={{ uri: track.thumbnail_url || track.thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="musical-notes" size={20} color={colors.primary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {[track.uploader, formatDuration(track.duration)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowPressed: { backgroundColor: colors.surface },
  thumb: { width: 56, height: 56, borderRadius: 6, backgroundColor: colors.surface },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 15.5 },
  subtitle: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, marginTop: 3 },
});
