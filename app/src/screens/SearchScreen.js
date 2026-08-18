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
import { useSettings } from '../context/SettingsContext';
import { createApiClient } from '../api/client';
import TrackRow from '../components/TrackRow';
import { colors } from '../theme/colors';

export default function SearchScreen() {
  const { serverUrl, apiKey } = useSettings();
  const api = createApiClient(serverUrl, apiKey);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState({});

  const isUrl = (text) => /^https?:\/\//.test(text.trim());

  const runSearch = async () => {
    if (!query.trim()) return;
    if (isUrl(query)) {
      await startDownload(query.trim(), { id: 'url', title: query.trim() });
      return;
    }
    setSearching(true);
    try {
      const res = await api.search(query.trim());
      setResults(res);
    } catch (err) {
      Alert.alert('검색 실패', err.message);
    } finally {
      setSearching(false);
    }
  };

  const startDownload = async (urlOrId, item) => {
    setDownloadingIds((d) => ({ ...d, [item.id]: true }));
    try {
      await api.download(urlOrId.startsWith('http') ? urlOrId : `https://www.youtube.com/watch?v=${urlOrId}`);
      Alert.alert('다운로드 시작', `${item.title} 다운로드를 서버에 요청했습니다.\n라이브러리 탭에서 진행 상황을 확인하세요.`);
    } catch (err) {
      Alert.alert('다운로드 요청 실패', err.message);
    } finally {
      setDownloadingIds((d) => {
        const { [item.id]: _drop, ...rest } = d;
        return rest;
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
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
        <Pressable style={styles.searchBtn} onPress={runSearch}>
          <Text style={styles.searchBtnText}>{isUrl(query) ? '다운로드' : '검색'}</Text>
        </Pressable>
      </View>

      {searching && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrackRow
            track={item}
            onPress={() => startDownload(item.id, item)}
            right={
              downloadingIds[item.id] ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.downloadLabel}>⬇</Text>
              )
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: { flexDirection: 'row', padding: 12, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  searchBtnText: { color: colors.onPrimary, fontWeight: '600' },
  downloadLabel: { color: colors.primary, fontSize: 20 },
});
