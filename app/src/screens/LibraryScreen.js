import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { useDownloads } from '../context/DownloadsContext';
import { usePlayer } from '../context/PlayerContext';
import { createApiClient } from '../api/client';
import TrackRow from '../components/TrackRow';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import TrackActions from '../components/TrackActions';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function LibraryScreen() {
  const { serverUrl, apiKey } = useSettings();
  const api = createApiClient(serverUrl, apiKey);
  const { isDownloaded, getLocalUri, downloadTrack, removeLocalTrack, progress } = useDownloads();
  const { playQueue } = usePlayer();

  const [tracks, setTracks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [playlistModalFor, setPlaylistModalFor] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setTracks(await api.listTracks());
    } catch (err) {
      // silent - shown via pull-to-refresh error only
    }
  }, [serverUrl, apiKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasActive = tracks.some((t) => t.status === 'downloading' || t.status === 'pending');
    if (hasActive) {
      pollRef.current = setInterval(load, 2000);
      return () => clearInterval(pollRef.current);
    }
  }, [tracks, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      Alert.alert('불러오기 실패', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const play = (track) => {
    const ready = tracks.filter((t) => t.status === 'ready');
    const queue = ready.map((t) => ({
      id: t.id,
      title: t.title,
      uploader: t.uploader,
      thumbnailUrl: t.thumbnail_url,
      source: isDownloaded(t.id)
        ? { uri: getLocalUri(t.id) }
        : { uri: api.trackFileUrl(t.id), headers: api.authHeaders() },
    }));
    const startIndex = queue.findIndex((t) => t.id === track.id);
    playQueue(queue, Math.max(0, startIndex));
  };

  const handleSaveLocal = async (track) => {
    try {
      await downloadTrack(track.id, api.trackFileUrl(track.id), api.authHeaders());
    } catch (err) {
      Alert.alert('폰 저장 실패', err.message);
    }
  };

  const handleDelete = async (track) => {
    Alert.alert('삭제', `"${track.title}" 를 서버 라이브러리에서 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTrack(track.id);
            if (isDownloaded(track.id)) await removeLocalTrack(track.id);
            load();
          } catch (err) {
            Alert.alert('삭제 실패', err.message);
          }
        },
      },
    ]);
  };

  const downloadedCount = tracks.filter((t) => isDownloaded(t.id)).length;

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={[styles.listContent, tracks.length === 0 && styles.listContentEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          tracks.length > 0 ? (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.statCardTint]}>
                <Text style={styles.statValue}>{tracks.length}</Text>
                <Text style={styles.statLabel}>전체 곡</Text>
              </View>
              <View style={[styles.statCard, styles.statCardInk]}>
                <Ionicons name="phone-portrait" size={16} color={colors.onInk} style={{ marginBottom: 2 }} />
                <Text style={[styles.statValue, styles.statValueInk]}>{downloadedCount}</Text>
                <Text style={styles.statLabelInk}>폰에 저장됨</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState icon="library-outline" title="아직 다운로드한 곡이 없어요" body="검색 탭에서 곡을 찾아 다운로드해보세요." />
        }
        renderItem={({ item }) => (
          <Card tight>
            <TrackRow
              track={item}
              onPress={() => item.status === 'ready' && play(item)}
              right={
                item.status === 'downloading' ? (
                  <Text style={styles.status}>{Math.round(item.progress)}%</Text>
                ) : item.status === 'pending' ? (
                  <Text style={styles.status}>대기중</Text>
                ) : item.status === 'failed' ? (
                  <Text style={[styles.status, styles.statusFailed]}>실패</Text>
                ) : isDownloaded(item.id) ? (
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
                ) : null
              }
            />
            {item.status === 'ready' && (
              <TrackActions
                downloaded={isDownloaded(item.id)}
                downloading={progress[item.id] !== undefined}
                onSaveLocal={() => handleSaveLocal(item)}
                onRemoveLocal={() => removeLocalTrack(item.id)}
                onAddToPlaylist={() => setPlaylistModalFor(item.id)}
                onDelete={() => handleDelete(item)}
              />
            )}
          </Card>
        )}
      />
      <AddToPlaylistModal
        visible={!!playlistModalFor}
        onClose={() => setPlaylistModalFor(null)}
        api={api}
        trackId={playlistModalFor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingTop: 8, paddingBottom: 16 },
  listContentEmpty: { flexGrow: 1 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 16, padding: 14 },
  statCardTint: { backgroundColor: colors.primaryTint },
  statCardInk: { backgroundColor: colors.ink },
  statValue: { color: colors.primary, fontFamily: fonts.extraBold, fontSize: 22 },
  statValueInk: { color: colors.onInk },
  statLabel: { color: colors.primaryPressed, fontFamily: fonts.semiBold, fontSize: 12, marginTop: 2 },
  statLabelInk: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.semiBold, fontSize: 12, marginTop: 2 },
  status: { color: colors.textSecondary, fontFamily: fonts.semiBold, fontSize: 12 },
  statusFailed: { color: colors.destructive },
});
