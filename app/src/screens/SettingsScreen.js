import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { useDownloads } from '../context/DownloadsContext';
import { createApiClient } from '../api/client';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

function Field({ icon, label, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput style={styles.input} placeholderTextColor={colors.placeholder} {...inputProps} />
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { serverUrl, apiKey, save } = useSettings();
  const { downloads, removeLocalTrack } = useDownloads();

  const [urlInput, setUrlInput] = useState(serverUrl);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [testing, setTesting] = useState(false);
  const [usedBytes, setUsedBytes] = useState(0);

  useEffect(() => {
    setUrlInput(serverUrl);
    setKeyInput(apiKey);
  }, [serverUrl, apiKey]);

  useEffect(() => {
    computeUsage();
  }, [downloads]);

  const computeUsage = () => {
    try {
      const dir = new Directory(Paths.document, 'tracks');
      if (!dir.exists) return setUsedBytes(0);
      const files = dir.list();
      const total = files.reduce((sum, f) => sum + (f.size || 0), 0);
      setUsedBytes(total);
    } catch {
      setUsedBytes(0);
    }
  };

  const onSave = async () => {
    await save(urlInput.trim(), keyInput.trim());
    Alert.alert('저장됨', '서버 설정이 저장되었습니다.');
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const api = createApiClient(urlInput.trim(), keyInput.trim());
      await api.health();
      Alert.alert('연결 성공', '서버에 정상적으로 연결되었습니다.');
    } catch (err) {
      Alert.alert('연결 실패', err.message);
    } finally {
      setTesting(false);
    }
  };

  const clearCache = () => {
    Alert.alert('전체 삭제', '폰에 저장된 모든 다운로드 파일을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          for (const id of Object.keys(downloads)) {
            await removeLocalTrack(id);
          }
          computeUsage();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>서버 연결</Text>
      <Field
        icon="server-outline"
        label="서버 주소"
        value={urlInput}
        onChangeText={setUrlInput}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.0.10:8000"
      />
      <Field
        icon="key-outline"
        label="API 키"
        value={keyInput}
        onChangeText={setKeyInput}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="서버 backend/.env 의 API_KEY 값"
        secureTextEntry
      />

      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={onSave}>
          <Text style={styles.btnText}>저장</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnOutline]} onPress={onTest} disabled={testing}>
          {testing ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.btnOutlineText}>연결 테스트</Text>}
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>저장 공간</Text>
      <View style={styles.usageRow}>
        <Ionicons name="phone-portrait-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.value}>
          {(usedBytes / 1024 / 1024).toFixed(1)} MB · {Object.keys(downloads).length}곡 저장됨
        </Text>
      </View>
      <Pressable style={[styles.btn, styles.destructiveBtn]} onPress={clearCache}>
        <Ionicons name="trash-outline" size={16} color={colors.onPrimary} />
        <Text style={styles.btnText}>모두 삭제</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.5, marginBottom: 12 },
  field: { marginBottom: 14 },
  label: { color: colors.textSecondary, fontFamily: fonts.semiBold, fontSize: 12, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 14, paddingVertical: 12 },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  btnOutline: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.primary },
  destructiveBtn: { backgroundColor: colors.destructive, marginTop: 14, flex: undefined },
  btnText: { color: colors.onPrimary, fontFamily: fonts.semiBold, fontSize: 14 },
  btnOutlineText: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 28 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  value: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
});
