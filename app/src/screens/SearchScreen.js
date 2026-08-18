import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { usePlayer } from '../context/PlayerContext';
import { createApiClient } from '../api/client';
import TrackRow from '../components/TrackRow';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
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
  const [savingIds, setSavingIds] = useState({});

  const isUrl = (text) => /^https?:\/\//.test(text.trim());

  const runSearch = async () => {
    if (!query.trim()) return;
    if (isUrl(query)) {
      await saveToLibrary(query.trim(), { id: 'url', title: query.trim() });
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

  // Live-streams straight from the backend's /api/preview proxy - nothing
  // saved, nothing downloaded. Tap the row to listen; tap the download icon
  // separately to actually keep it in the library.
  const preview = (item) => {
    playQueue(
      [
        {
          id: item.id,
          title: item.title,
          uploader: item.uploader,
          thumbnailUrl: item.thumbnail_url,
          source: { uri: api.previewUrl(item.id), headers: api.authHeaders() },
        },
      ],
      0
    );
  };

  const saveToLibrary = async (urlOrId, item) => {
    setSavingIds((d) => ({ ...d, [item.id]: true }));
    try {
      await api.download(urlOrId.startsWith('http') ? urlOrId : `https://www.youtube.com/watch?v=${urlOrId}`);
      Alert.alert('다운로드 시작', `${item.title} 다운로드를 서버에 요청했습니다.\n라이브러리 탭에서 진행 상황을 확인하세요.`);
    } catch (err) {
      Alert.alert('다운로드 요청 실패', err.message);
    } finally {
      setSavingIds((d) => {
        const { [item.id]: _drop, ...rest } = d;
        return rest;
      });
    }
  };

  return (
    <View style={styles.container}>
      <Card tight style={styles.searchBarCard}>
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
      </Card>

      <View style={styles.content}>
        {searching ? (
          <ActivityIndicator color={colors.primary} />
        ) : !searched ? (
          <EmptyState
            icon="search"
            title="유튜브에서 찾아보세요"
            body="곡을 탭하면 바로 미리듣기가 재생돼요. 다운로드 아이콘을 누르면 라이브러리에 저장돼요."
          />
        ) : results.length === 0 ? (
          <EmptyState icon="sad-outline" title="검색 결과가 없어요" />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card tight>
                <TrackRow
                  track={item}
                  onPress={() => preview(item)}
                  right={
                    savingIds[item.id] ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Pressable onPress={() => saveToLibrary(item.id, item)} hitSlop={10}>
                        <Ionicons name="download-outline" size={22} color={colors.primary} />
                      </Pressable>
                    )
                  }
                />
              </Card>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBarCard: { backgroundColor: colors.bg, marginTop: 4 },
  content: { flex: 1 },
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
});
