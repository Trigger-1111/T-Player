import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const DISC_SIZE = 216;

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// The rotating record. A single looping 0->1 timing that maps to 0->360deg -
// since 360deg looks identical to 0deg, the loop restarting is seamless.
// Stopping it (pause) just freezes the Animated.Value where it is; starting
// again resumes from there rather than jumping back to 0.
function SpinningDisc({ thumbnailUrl, spinning }) {
  const spin = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (spinning) {
      loopRef.current = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
    }
    return () => loopRef.current?.stop();
  }, [spinning, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.discShadowWrap}>
      <Animated.View style={[styles.disc, { transform: [{ rotate }] }]}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.discArt} />
        ) : (
          <View style={[styles.discArt, styles.discArtFallback]}>
            <Ionicons name="musical-notes" size={56} color={colors.primary} />
          </View>
        )}
        <View style={styles.discRingOuter} pointerEvents="none" />
        <View style={styles.discRingInner} pointerEvents="none" />
        <View style={styles.discHole} />
      </Animated.View>
    </View>
  );
}

// Same footprint as the disc so tapping between the two doesn't shift the
// rest of the layout. No real lyrics source is wired up yet - this is the
// view it'll render into once one is.
function LyricsPanel() {
  return (
    <View style={styles.lyricsPanel}>
      <View style={styles.lyricsHeader}>
        <Ionicons name="mic-outline" size={14} color="rgba(255,255,255,0.5)" />
        <Text style={styles.lyricsHeaderText}>가사</Text>
      </View>
      <View style={styles.lyricsBody}>
        <Ionicons name="musical-notes-outline" size={28} color="rgba(255,255,255,0.25)" />
        <Text style={styles.lyricsPlaceholder}>가사는 아직 준비 중이에요.</Text>
      </View>
      <View style={styles.lyricsHint}>
        <Ionicons name="disc-outline" size={12} color="rgba(255,255,255,0.55)" />
        <Text style={styles.lyricsHintText}>탭하면 앨범아트로</Text>
      </View>
    </View>
  );
}

export default function NowPlayingScreen() {
  const { currentTrack, status, playPause, next, prev, seekTo, repeatMode, cycleRepeat } = usePlayer();

  // Tapping the disc flips this area over to a lyrics view and back -
  // same footprint, title/slider/controls underneath stay put.
  const [showLyrics, setShowLyrics] = useState(false);

  // Local scrub position so dragging the slider doesn't fight the ~500ms
  // status updates coming from the player while the user's finger is down.
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  useEffect(() => {
    if (!scrubbing) setScrubValue(status.currentTime || 0);
  }, [status.currentTime, scrubbing]);

  if (!currentTrack) {
    // This is a regular tab now (not a dismissable modal pushed only while
    // something's playing), so it needs its own idle state instead of just
    // bouncing back to whatever screen was open before.
    return (
      <LinearGradient colors={[colors.inkAlt, colors.ink]} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.topBar}>
            <Text style={styles.topBarLabel}>재생 중</Text>
          </View>
          <View style={styles.emptyState}>
            <Ionicons name="disc-outline" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyTitle}>재생 중인 곡이 없어요</Text>
            <Text style={styles.emptyBody}>검색이나 라이브러리에서 곡을 눌러 재생해보세요.</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const duration = status.duration || 0;

  return (
    <LinearGradient colors={[colors.inkAlt, colors.ink]} style={styles.gradient}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.topBarLabel}>재생 중</Text>
      </View>

      <Pressable style={styles.artworkWrap} onPress={() => setShowLyrics((v) => !v)}>
        {showLyrics ? (
          <LyricsPanel />
        ) : (
          <>
            <SpinningDisc thumbnailUrl={currentTrack.thumbnailUrl} spinning={status.playing} />
            <View style={styles.lyricsHint}>
              <Ionicons name="mic-outline" size={12} color="rgba(255,255,255,0.55)" />
              <Text style={styles.lyricsHintText}>탭하면 가사 보기</Text>
            </View>
          </>
        )}
      </Pressable>

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  topBar: { alignItems: 'center', paddingTop: 8 },
  topBarLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.semiBold, fontSize: 12, letterSpacing: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { color: colors.onInk, fontFamily: fonts.bold, fontSize: 16, marginTop: 4 },
  emptyBody: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  artworkWrap: { alignItems: 'center', marginTop: 16 },
  discShadowWrap: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    backgroundColor: colors.inkAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  discArt: { position: 'absolute', width: '100%', height: '100%' },
  discArtFallback: { alignItems: 'center', justifyContent: 'center' },
  discRingOuter: {
    position: 'absolute',
    width: '78%',
    height: '78%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  discRingInner: {
    position: 'absolute',
    width: '40%',
    height: '40%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  discHole: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  meta: { marginTop: 20 },
  title: { color: colors.onInk, fontFamily: fonts.extraBold, fontSize: 20, lineHeight: 25 },
  uploader: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.medium, fontSize: 14, marginTop: 6 },
  lyricsPanel: {
    width: DISC_SIZE + 24,
    height: DISC_SIZE,
    backgroundColor: colors.inkAlt,
    borderRadius: 20,
    padding: 16,
  },
  lyricsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lyricsHeaderText: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 0.5 },
  lyricsBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  lyricsPlaceholder: { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.medium, fontSize: 13 },
  lyricsHint: { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center', marginTop: 10 },
  lyricsHintText: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.medium, fontSize: 11 },
  sliderWrap: { marginTop: 18 },
  slider: { width: '100%', height: 32 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  time: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.medium, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 4 },
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
