import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

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
          <View style={styles.sheetHandle} />
          <Text style={styles.header}>플레이리스트에 추가</Text>
          <FlatList
            data={playlists}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => addTo(item.id)}>
                <Ionicons name="albums" size={16} color={colors.primary} style={{ marginRight: 10 }} />
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
              placeholderTextColor={colors.placeholder}
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
  backdrop: { flex: 1, backgroundColor: 'rgba(23,19,15,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingTop: 10, maxHeight: '70%' },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  header: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15 },
  rowCount: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 },
  empty: { color: colors.textSecondary, fontFamily: fonts.medium, paddingVertical: 12 },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12 },
  createBtnText: { color: colors.onPrimary, fontFamily: fonts.semiBold, fontSize: 13 },
});
