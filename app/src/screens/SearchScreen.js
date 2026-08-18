import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { usePlayer } from '../context/PlayerContext';
import { createApiClient } from '../api/client';
import TrackRow from '../components/TrackRow';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function SearchScreen() {
  const { serverUrl, apiKey } = useSettings();
  const api = createApiClient(serverUrl, apiKey);
  const { playQueue } = usePlayer();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busyIds, setBusyIds] = useState({});

  const isUrl = (text) => /^https?:\/\//.test(text.trim());

  const runSearch = async () => {
    if (!query.trim()) return;
    if (isUrl(query)) {
      await previewAndSave(query.trim(), { id: 'url', title: query.trim() });
      return;
    }
    setSearching(true);
    try {
      const res = await api.search(query.trim());
      setResults(res);
      setSearched(true);
    } catch (err) {
      Alert.alert('검색 실패', err.message);
    } finally {
      setSearching(false);
    }
  };

  // There's no true instant streaming preview here - YouTube now requires a
  // signed token + JS challenge solve for basically every downloadable
  // format, so the backend already has to run the full yt-dlp download to
  // get *any* audio out of it. Instead we kick that download off and, the
  // moment it's ready, start playing it straight away - by then it's also
  // sitting in the library, so nothing extra to do if the user keeps it.
  const waitUntilReady = async (trackId) => {
    for (let i = 0; i < 60; i++) {
      const t = await api.trackStatus(trackId);
      if (t.status === 'ready') return t;
      if (t.status === 'failed') {
        Alert.alert('다운로드 실패', t.error || '알 수 없는 오류가 발생했어요.');
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    Alert.alert('시간 초과', '다운로드가 오래 걸리고 있어요. 라이브러리 탭에서 진행 상황을 확인해보세요.');
    return null;
  };

  const previewAndSave = async (urlOrId, item) => {
    setBusyIds((d) => ({ ...d, [item.id]: true }));
    try {
      const track = await api.download(urlOrId.startsWith('http') ? urlOrId : `https://www.youtube.com/watch?v=${urlOrId}`);
      const ready = await waitUntilReady(track.id);
      if (ready) {
        playQueue(
          [
            {
              id: ready.id,
              title: ready.title,
              uploader: ready.uploader,
              thumbnailUrl: ready.thumbnail_url,
              source: { uri: api.trackFileUrl(ready.id), headers: api.authHeaders() },
            },
          ],
          0
        );
      }
    } catch (err) {
      Alert.alert('다운로드 요청 실패', err.message);
    } finally {
      setBusyIds((d) => {
        const { [item.id]: _drop, ...rest } = d;
        return rest;
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="검색어 또는 유튜브 URL 입력"
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>
        <Pressable style={styles.searchBtn} onPress={runSearch}>
          <Text style={styles.searchBtnText}>{isUrl(query) ? '다운로드' : '검색'}</Text>
        </Pressable>
      </View>

      {searching && <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />}

      {!searching && !searched && (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>유튜브에서 찾아보세요</Text>
          <Text style={styles.emptyBody}>곡을 탭하면 바로 미리듣기가 시작되고, 라이브러리에도 저장돼요.</Text>
        </View>
      )}

      {!searching && searched && results.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="sad-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card tight>
            <TrackRow
              track={item}
              onPress={() => previewAndSave(item.id, item)}
              right={
                busyIds[item.id] ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons name="play-circle-outline" size={24} color={colors.primary} />
                )
              }
            />
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: { flexDirection: 'row', padding: 12, gap: 8 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 6 },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
    paddingVertical: 12,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 12,
  },
  searchBtnText: { color: colors.onPrimary, fontFamily: fonts.semiBold, fontSize: 14 },
  listContent: { paddingTop: 8, paddingBottom: 16 },
  emptyState: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginTop: 4 },
  emptyBody: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
