import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme/colors';

export default function MiniPlayer() {
  const { currentTrack, status, playPause, next, prev } = usePlayer();

  if (!currentTrack) return null;

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      <View style={styles.content}>
        {currentTrack.thumbnailUrl ? (
          <Image source={{ uri: currentTrack.thumbnailUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {currentTrack.uploader}
          </Text>
        </View>
        <Pressable onPress={prev} hitSlop={10} style={styles.ctrlBtn}>
          <Text style={styles.ctrl}>⏮</Text>
        </Pressable>
        <Pressable onPress={playPause} hitSlop={10} style={styles.ctrlBtn}>
          <Text style={styles.ctrl}>{status.playing ? '⏸' : '▶️'}</Text>
        </Pressable>
        <Pressable onPress={next} hitSlop={10} style={styles.ctrlBtn}>
          <Text style={styles.ctrl}>⏭</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  progressBar: { height: 2, backgroundColor: colors.primary },
  content: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 10 },
  thumb: { width: 36, height: 36, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  thumbFallback: { backgroundColor: colors.surfaceAlt },
  info: { flex: 1 },
  title: { color: colors.text, fontSize: 13, fontWeight: '500' },
  subtitle: { color: colors.textSecondary, fontSize: 11 },
  ctrlBtn: { paddingHorizontal: 4 },
  ctrl: { fontSize: 20 },
});
