import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { createApiClient } from '../api/client';
import { colors } from '../theme/colors';

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
        ListEmptyComponent={<Text style={styles.empty}>플레이리스트가 없습니다.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id, name: item.name })}
            onLongPress={() => remove(item)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.count}>{item.track_ids.length}곡</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  newRow: { flexDirection: 'row', gap: 8, padding: 12 },
  input: { flex: 1, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, borderRadius: 8 },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  createBtnText: { color: colors.onPrimary, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { color: colors.text, fontSize: 16 },
  count: { color: colors.textSecondary },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
