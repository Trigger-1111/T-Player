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

export default function TrackRow({ track, onPress, right }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      {track.thumbnail_url || track.thumbnailUrl ? (
        <Image source={{ uri: track.thumbnail_url || track.thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="musical-notes" size={18} color={colors.primary} />
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
    paddingVertical: 9,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowPressed: { backgroundColor: colors.surface },
  thumb: { width: 46, height: 46, borderRadius: 8, backgroundColor: colors.surface },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 15 },
  subtitle: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
});
