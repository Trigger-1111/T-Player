import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { usePlayer } from '../context/PlayerContext';
import { createApiClient } from '../api/client';
import TrackRow from '../components/TrackRow';
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
  const [selectedIds, setSelectedIds] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const isUrl = (text) => /^https?:\/\//.test(text.trim());
  const selectedCount = Object.keys(selectedIds).length;

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
      setSelectedIds({});
    } catch (err) {
      Alert.alert('검색 실패', err.message);
    } finally {
      setSearching(false);
    }
  };

  // Live-streams straight from the backend's /api/preview proxy - nothing
  // saved, nothing downloaded. Tap the row to listen; tap the + separately
  // to actually keep it in the library.
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

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const requestDownload = async (urlOrId) => {
    await api.download(urlOrId.startsWith('http') ? urlOrId : `https://www.youtube.com/watch?v=${urlOrId}`);
  };

  const saveToLibrary = async (urlOrId, item) => {
    setSavingIds((d) => ({ ...d, [item.id]: true }));
    try {
      await requestDownload(urlOrId);
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

  const saveSelected = async () => {
    const ids = Object.keys(selectedIds);
    if (ids.length === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(ids.map((id) => requestDownload(id)));
      Alert.alert('다운로드 시작', `${ids.length}곡 다운로드를 서버에 요청했습니다.\n라이브러리 탭에서 진행 상황을 확인하세요.`);
      setSelectedIds({});
    } catch (err) {
      Alert.alert('다운로드 요청 실패', err.message);
    } finally {
      setBulkSaving(false);
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

      <View style={styles.content}>
        {searching ? (
          <ActivityIndicator color={colors.primary} />
        ) : !searched ? (
          <EmptyState
            icon="search"
            title="유튜브에서 찾아보세요"
            body="곡을 탭하면 바로 미리듣기가 재생돼요. 체크 후 한 번에, 또는 + 로 하나씩 저장할 수 있어요."
          />
        ) : results.length === 0 ? (
          <EmptyState icon="sad-outline" title="검색 결과가 없어요" />
        ) : (
          <>
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const checked = !!selectedIds[item.id];
                return (
                  <TrackRow
                    track={item}
                    onPress={() => preview(item)}
                    left={
                      <Pressable onPress={() => toggleSelected(item.id)} hitSlop={10}>
                        <Ionicons
                          name={checked ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={checked ? colors.primary : colors.textMuted}
                        />
                      </Pressable>
                    }
                    right={
                      savingIds[item.id] ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Pressable onPress={() => saveToLibrary(item.id, item)} hitSlop={10} style={styles.addBtn}>
                          <Ionicons name="add" size={18} color={colors.onPrimary} />
                        </Pressable>
                      )
                    }
                  />
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
            {selectedCount > 0 && (
              <View style={styles.bulkBar}>
                <Text style={styles.bulkText}>{selectedCount}곡 선택됨</Text>
                <Pressable style={styles.bulkBtn} onPress={saveSelected} disabled={bulkSaving}>
                  {bulkSaving ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.bulkBtnText}>선택한 곡 다운로드</Text>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bulkText: { color: colors.onPrimary, fontFamily: fonts.semiBold, fontSize: 13 },
  bulkBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  bulkBtnText: { color: colors.onPrimary, fontFamily: fonts.semiBold, fontSize: 13 },
});
