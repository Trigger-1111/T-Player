import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { createApiClient } from '../api/client';

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
          placeholderTextColor="#777"
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
  container: { flex: 1, backgroundColor: '#000' },
  newRow: { flexDirection: 'row', gap: 8, padding: 12 },
  input: { flex: 1, backgroundColor: '#1c1c1e', color: '#fff', paddingHorizontal: 12, borderRadius: 8 },
  createBtn: { backgroundColor: '#2f6fed', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  createBtnText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomColor: '#1c1c1e',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { color: '#fff', fontSize: 16 },
  count: { color: '#999' },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
});
