import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useDownloads } from '../context/DownloadsContext';
import { usePlayer } from '../context/PlayerContext';
import { createApiClient } from '../api/client';
import TrackRow from '../components/TrackRow';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import TrackActions from '../components/TrackActions';
import { colors } from '../theme/colors';

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

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>아직 다운로드한 곡이 없습니다. 검색 탭에서 추가해보세요.</Text>}
        renderItem={({ item }) => (
          <View>
            <TrackRow
              track={item}
              onPress={() => item.status === 'ready' && play(item)}
              right={
                <Text style={styles.status}>
                  {item.status === 'downloading'
                    ? `${Math.round(item.progress)}%`
                    : item.status === 'pending'
                    ? '대기중'
                    : item.status === 'failed'
                    ? '실패'
                    : isDownloaded(item.id)
                    ? '📱'
                    : ''}
                </Text>
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
          </View>
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
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  status: { color: colors.textSecondary, fontSize: 12 },
});
