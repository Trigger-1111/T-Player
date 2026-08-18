import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View, Pressable, ActivityIndicator } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { useSettings } from '../context/SettingsContext';
import { useDownloads } from '../context/DownloadsContext';
import { createApiClient } from '../api/client';
import { colors } from '../theme/colors';

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
    <View style={styles.container}>
      <Text style={styles.label}>서버 주소 (예: http://100.x.x.x:8000)</Text>
      <TextInput
        style={styles.input}
        value={urlInput}
        onChangeText={setUrlInput}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.0.10:8000"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>API 키</Text>
      <TextInput
        style={styles.input}
        value={keyInput}
        onChangeText={setKeyInput}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="서버 backend/.env 의 API_KEY 값"
        placeholderTextColor={colors.placeholder}
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

      <Text style={styles.label}>로컬 저장 용량</Text>
      <Text style={styles.value}>{(usedBytes / 1024 / 1024).toFixed(1)} MB ({Object.keys(downloads).length}곡)</Text>
      <Pressable style={[styles.btn, styles.destructiveBtn]} onPress={clearCache}>
        <Text style={styles.btnText}>모두 삭제</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  label: { color: colors.textSecondary, fontSize: 13, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  btnOutline: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.primary },
  destructiveBtn: { backgroundColor: colors.destructive, marginTop: 12 },
  btnText: { color: colors.onPrimary, fontWeight: '600' },
  btnOutlineText: { color: colors.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  value: { color: colors.text, fontSize: 14 },
});
