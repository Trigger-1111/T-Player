import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function TrackActions({
  downloaded,
  downloading,
  onSaveLocal,
  onRemoveLocal,
  onAddToPlaylist,
  onDelete,
}) {
  return (
    <View style={styles.row}>
      {downloading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : downloaded ? (
        <Pressable onPress={onRemoveLocal}>
          <Text style={styles.action}>폰에서 삭제</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onSaveLocal}>
          <Text style={styles.action}>폰에 저장</Text>
        </Pressable>
      )}
      {onAddToPlaylist && (
        <Pressable onPress={onAddToPlaylist}>
          <Text style={styles.action}>+ 플레이리스트</Text>
        </Pressable>
      )}
      <Pressable onPress={onDelete}>
        <Text style={[styles.action, styles.destructive]}>삭제</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16, paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2 },
  action: { color: colors.primary, fontSize: 12 },
  destructive: { color: colors.destructive },
});
