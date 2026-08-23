import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { createApiClient } from '../api/client';
import EmptyState from '../components/EmptyState';
import BrandHeader from '../components/BrandHeader';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function PlaylistsScreen({ navigation }) {
  const { serverUrl, apiKey } = useSettings();
  const api = createApiClient(serverUrl, apiKey);

  const [playlists, setPlaylists] = useState([]);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    try {
      setPlaylists(await api.listPlaylists());
    } catch (err) {
      // ignore until settings configured
    }
  }, [serverUrl, apiKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const create = async () => {
    if (!newName.trim()) return;
    try {
      await api.createPlaylist(newName.trim());
      setNewName('');
      load();
    } catch (err) {
      Alert.alert('생성 실패', err.message);
    }
  };

  const remove = (playlist) => {
    Alert.alert('삭제', `"${playlist.name}" 플레이리스트를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await api.deletePlaylist(playlist.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <BrandHeader />
      <View style={styles.newRow}>
        <TextInput
          style={styles.input}
          placeholder="새 플레이리스트 이름"
          placeholderTextColor={colors.placeholder}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={create}
        />
        <Pressable style={styles.createBtn} onPress={create}>
          <Text style={styles.createBtnText}>만들기</Text>
        </Pressable>
      </View>
      <FlatList
        data={playlists}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.listContent, playlists.length === 0 && styles.listContentEmpty]}
        ListEmptyComponent={
          <EmptyState icon="albums-outline" title="플레이리스트가 없어요" body="위에서 이름을 입력하고 만들어보세요." />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id, name: item.name })}
            onLongPress={() => remove(item)}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="albums" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.count}>{item.track_ids.length}곡</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  newRow: { flexDirection: 'row', gap: 8, padding: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 12 },
  createBtnText: { color: colors.onPrimary, fontFamily: fonts.semiBold, fontSize: 14 },
  listContent: { paddingTop: 8, paddingBottom: 16 },
  listContentEmpty: { flexGrow: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 84 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowIcon: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 15.5 },
  count: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, marginTop: 3 },
});
