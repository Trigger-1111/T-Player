import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { createApiClient } from '../api/client';
import Card from '../components/Card';
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
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>플레이리스트가 없어요</Text>
            <Text style={styles.emptyBody}>위에서 이름을 입력하고 만들어보세요.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card tight style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id, name: item.name })}
              onLongPress={() => remove(item)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="albums" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.count}>{item.track_ids.length}곡</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </Card>
        )}
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
  card: { backgroundColor: colors.bg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  name: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 15 },
  count: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginTop: 4 },
  emptyBody: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
