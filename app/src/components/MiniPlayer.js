import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function MiniPlayer() {
  const { currentTrack, status, playPause, next, prev } = usePlayer();
  const navigation = useNavigation();

  if (!currentTrack) return null;

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      <View style={styles.content}>
        <Pressable
          style={styles.tapArea}
          onPress={() => navigation.navigate('Playing')}
        >
          {currentTrack.thumbnailUrl ? (
            <Image source={{ uri: currentTrack.thumbnailUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <Ionicons name="musical-notes" size={16} color={colors.primary} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {currentTrack.uploader}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={prev} hitSlop={10} style={styles.ctrlBtn}>
          <Ionicons name="play-skip-back" size={20} color={colors.text} />
        </Pressable>
        <Pressable onPress={playPause} hitSlop={10} style={styles.ctrlBtn}>
          <Ionicons name={status.playing ? 'pause' : 'play'} size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={next} hitSlop={10} style={styles.ctrlBtn}>
          <Ionicons name="play-skip-forward" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  progressBar: { height: 2, backgroundColor: colors.primary },
  content: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 10 },
  tapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 42, height: 42, borderRadius: 5, backgroundColor: colors.surface },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 13.5 },
  subtitle: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 11.5, marginTop: 1 },
  ctrlBtn: { paddingHorizontal: 5 },
});
