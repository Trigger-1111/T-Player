import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { useDownloads } from '../context/DownloadsContext';
import { createApiClient } from '../api/client';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

function SectionTitle({ icon, children }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

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

  const usedMb = usedBytes / 1024 / 1024;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionTitle icon="server-outline">서버 연결</SectionTitle>
      <Card style={styles.sectionCard}>
        <Field
          icon="link-outline"
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
      </Card>

      <SectionTitle icon="phone-portrait-outline">저장 공간</SectionTitle>
      <Card style={[styles.sectionCard, styles.usageCard]}>
        <View style={styles.usageTopRow}>
          <Text style={styles.usageValue}>{usedMb.toFixed(1)} MB</Text>
          <Text style={styles.usageCount}>{Object.keys(downloads).length}곡 저장됨</Text>
        </View>
        <View style={styles.usageBarTrack}>
          <View style={[styles.usageBarFill, { width: `${Math.min(100, (usedMb / 500) * 100)}%` }]} />
        </View>
        <Pressable style={[styles.btn, styles.destructiveBtn]} onPress={clearCache}>
          <Ionicons name="trash-outline" size={16} color={colors.onPrimary} />
          <Text style={styles.btnText}>모두 삭제</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 10, paddingHorizontal: 2 },
  sectionIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 13 },
  sectionCard: { backgroundColor: colors.bg, marginHorizontal: 0, padding: 14 },
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
  row: { flexDirection: 'row', gap: 10, marginTop: 2 },
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
  destructiveBtn: { backgroundColor: colors.destructive, marginTop: 4, flex: undefined },
  btnText: { color: colors.onPrimary, fontFamily: fonts.semiBold, fontSize: 14 },
  btnOutlineText: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 14 },
  usageCard: { gap: 12 },
  usageTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  usageValue: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 20 },
  usageCount: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 },
  usageBarTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  usageBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
});
