import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AddToPlaylistModal({ visible, onClose, api, trackId }) {
  const [playlists, setPlaylists] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) refresh();
  }, [visible]);

  const refresh = async () => {
    setLoading(true);
    try {
      setPlaylists(await api.listPlaylists());
    } catch (err) {
      Alert.alert('불러오기 실패', err.message);
    } finally {
      setLoading(false);
    }
  };

  const addTo = async (playlistId) => {
    try {
      await api.addTrackToPlaylist(playlistId, trackId);
      onClose();
    } catch (err) {
      Alert.alert('추가 실패', err.message);
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    try {
      const p = await api.createPlaylist(newName.trim());
      setNewName('');
      await addTo(p.id);
    } catch (err) {
      Alert.alert('생성 실패', err.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.header}>플레이리스트에 추가</Text>
          <FlatList
            data={playlists}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => addTo(item.id)}>
                <Text style={styles.rowText}>{item.name}</Text>
                <Text style={styles.rowCount}>{item.track_ids.length}곡</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              !loading && <Text style={styles.empty}>플레이리스트가 없습니다. 아래에서 새로 만드세요.</Text>
            }
          />
          <View style={styles.newRow}>
            <TextInput
              style={styles.input}
              placeholder="새 플레이리스트 이름"
              placeholderTextColor="#777"
              value={newName}
              onChangeText={setNewName}
            />
            <Pressable style={styles.createBtn} onPress={createAndAdd}>
              <Text style={styles.createBtnText}>만들기+추가</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%' },
  header: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomColor: '#2c2c2e', borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { color: '#fff', fontSize: 15 },
  rowCount: { color: '#999', fontSize: 13 },
  empty: { color: '#999', paddingVertical: 12 },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, backgroundColor: '#2c2c2e', color: '#fff', paddingHorizontal: 12, borderRadius: 8 },
  createBtn: { backgroundColor: '#2f6fed', paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 },
  createBtnText: { color: '#fff', fontWeight: '600' },
});
