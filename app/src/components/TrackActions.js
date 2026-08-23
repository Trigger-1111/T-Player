import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

function Action({ icon, label, color = colors.primary, onPress }) {
  return (
    <Pressable style={styles.action} onPress={onPress} hitSlop={6}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export default function TrackActions({
  downloaded,
  downloading,
  onSaveLocal,
  onRemoveLocal,
  onAddToPlaylist,
  onDelete,
  deleteLabel = '삭제',
}) {
  return (
    <View style={styles.row}>
      {downloading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : downloaded ? (
        <Action icon="phone-portrait" label="폰에서 삭제" onPress={onRemoveLocal} />
      ) : (
        <Action icon="download-outline" label="폰에 저장" onPress={onSaveLocal} />
      )}
      {onAddToPlaylist && <Action icon="add-circle-outline" label="플레이리스트" onPress={onAddToPlaylist} />}
      <Action icon="trash-outline" label={deleteLabel} color={colors.destructive} onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 18,
    paddingLeft: 84,
    paddingRight: 16,
    paddingBottom: 10,
    marginTop: -2,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLabel: { fontFamily: fonts.semiBold, fontSize: 12 },
});
