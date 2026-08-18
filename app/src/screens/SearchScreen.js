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
import { createApiClient } from '../api/client';
import TrackRow from '../components/TrackRow';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function SearchScreen() {
  const { serverUrl, apiKey } = useSettings();
  const api = createApiClient(serverUrl, apiKey);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
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
      setSearched(true);
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
          <Text style={styles.emptyBody}>검색어를 입력하거나, 유튜브 링크를 그대로 붙여넣으면 바로 다운로드돼요.</Text>
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
              onPress={() => startDownload(item.id, item)}
              right={
                downloadingIds[item.id] ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons name="download-outline" size={22} color={colors.primary} />
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
