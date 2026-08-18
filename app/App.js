import { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_600SemiBold,
  NotoSansKR_700Bold,
  NotoSansKR_800ExtraBold,
} from '@expo-google-fonts/noto-sans-kr';

import { SettingsProvider } from './src/context/SettingsContext';
import { DownloadsProvider } from './src/context/DownloadsContext';
import { PlayerProvider } from './src/context/PlayerContext';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_600SemiBold,
    NotoSansKR_700Bold,
    NotoSansKR_800ExtraBold,
  });

  const onLayout = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider onLayout={onLayout} style={{ backgroundColor: colors.bg }}>
      <SettingsProvider>
        <DownloadsProvider>
          <PlayerProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </PlayerProvider>
        </DownloadsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
