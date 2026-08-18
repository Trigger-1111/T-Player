import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useDownloads } from '../context/DownloadsContext';
import { usePlayer } from '../context/PlayerContext';
import { createApiClient } from '../api/client';
import TrackRow from '../components/TrackRow';
import TrackActions from '../components/TrackActions';
import { colors } from '../theme/colors';

export default function PlaylistDetailScreen({ route }) {
  const { playlistId, name } = route.params;
  const { serverUrl, apiKey } = useSettings();
  const api = createApiClient(serverUrl, apiKey);
  const { isDownloaded, getLocalUri, downloadTrack, removeLocalTrack, progress } = useDownloads();
  const { playQueue } = usePlayer();

  const [tracks, setTracks] = useState([]);

  const load = useCallback(async () => {
    try {
      const playlist = await api.listPlaylists().then((all) => all.find((p) => p.id === playlistId));
      if (!playlist) return;
      const allTracks = await api.listTracks();
      const byId = Object.fromEntries(allTracks.map((t) => [t.id, t]));
      setTracks(playlist.track_ids.map((id) => byId[id]).filter(Boolean));
    } catch (err) {
      // ignore
    }
  }, [playlistId, serverUrl, apiKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

  const handleRemove = async (track) => {
    try {
      await api.removeTrackFromPlaylist(playlistId, track.id);
      load();
    } catch (err) {
      Alert.alert('제거 실패', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<Text style={styles.empty}>이 플레이리스트에 곡이 없습니다.</Text>}
        renderItem={({ item }) => (
          <View>
            <TrackRow track={item} onPress={() => play(item)} />
            <TrackActions
              downloaded={isDownloaded(item.id)}
              downloading={progress[item.id] !== undefined}
              onSaveLocal={() => downloadTrack(item.id, api.trackFileUrl(item.id), api.authHeaders())}
              onRemoveLocal={() => removeLocalTrack(item.id)}
              onDelete={() => handleRemove(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
