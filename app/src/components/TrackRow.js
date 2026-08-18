import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TrackRow({ track, onPress, right }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {track.thumbnail_url || track.thumbnailUrl ? (
        <Image source={{ uri: track.thumbnail_url || track.thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
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
    paddingHorizontal: 12,
    gap: 12,
  },
  thumb: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#222' },
  thumbFallback: { backgroundColor: '#333' },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '500' },
  subtitle: { color: '#999', fontSize: 12, marginTop: 2 },
});
