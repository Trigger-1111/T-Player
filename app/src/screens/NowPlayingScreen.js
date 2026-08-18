import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function NowPlayingScreen({ navigation }) {
  const { currentTrack, status, playPause, next, prev, seekTo, repeatMode, cycleRepeat } = usePlayer();

  // Local scrub position so dragging the slider doesn't fight the ~500ms
  // status updates coming from the player while the user's finger is down.
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  useEffect(() => {
    if (!scrubbing) setScrubValue(status.currentTime || 0);
  }, [status.currentTime, scrubbing]);

  if (!currentTrack) {
    navigation.goBack();
    return null;
  }

  const duration = status.duration || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="chevron-down" size={26} color={colors.onInk} />
        </Pressable>
        <Text style={styles.topBarLabel}>재생 중</Text>
        <View style={styles.closeBtn} />
      </View>

      <View style={styles.artworkWrap}>
        {currentTrack.thumbnailUrl ? (
          <Image source={{ uri: currentTrack.thumbnailUrl }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.artworkFallback]}>
            <Ionicons name="musical-notes" size={64} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {currentTrack.title}
        </Text>
        {!!currentTrack.uploader && (
          <Text style={styles.uploader} numberOfLines={1}>
            {currentTrack.uploader}
          </Text>
        )}
      </View>

      <View style={styles.sliderWrap}>
        <Slider
          style={styles.slider}
          value={scrubValue}
          minimumValue={0}
          maximumValue={Math.max(duration, 0.1)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor={colors.primary}
          onSlidingStart={() => setScrubbing(true)}
          onValueChange={setScrubValue}
          onSlidingComplete={(v) => {
            seekTo(v);
            setScrubbing(false);
          }}
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(scrubbing ? scrubValue : status.currentTime)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={cycleRepeat} hitSlop={12}>
          {repeatMode === 'one' ? (
            <MaterialCommunityIcons name="repeat-once" size={24} color={colors.primary} />
          ) : (
            <Ionicons name="repeat" size={24} color={repeatMode === 'all' ? colors.primary : 'rgba(255,255,255,0.4)'} />
          )}
        </Pressable>
        <Pressable onPress={prev} hitSlop={12}>
          <Ionicons name="play-skip-back" size={32} color={colors.onInk} />
        </Pressable>
        <Pressable onPress={playPause} style={styles.playBtn} hitSlop={8}>
          <Ionicons name={status.playing ? 'pause' : 'play'} size={30} color={colors.onPrimary} style={!status.playing && styles.playIconOffset} />
        </Pressable>
        <Pressable onPress={next} hitSlop={12}>
          <Ionicons name="play-skip-forward" size={32} color={colors.onInk} />
        </Pressable>
        <View style={{ width: 24 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  closeBtn: { width: 26, alignItems: 'center' },
  topBarLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.semiBold, fontSize: 12, letterSpacing: 1 },
  artworkWrap: { alignItems: 'center', marginTop: 32 },
  artwork: { width: 280, height: 280, borderRadius: 16, backgroundColor: colors.inkAlt },
  artworkFallback: { alignItems: 'center', justifyContent: 'center' },
  meta: { marginTop: 32 },
  title: { color: colors.onInk, fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28 },
  uploader: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.medium, fontSize: 14, marginTop: 6 },
  sliderWrap: { marginTop: 28 },
  slider: { width: '100%', height: 32 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  time: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.medium, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 36, paddingHorizontal: 4 },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOffset: { marginLeft: 3 },
});
