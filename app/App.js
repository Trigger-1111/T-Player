import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsProvider } from './src/context/SettingsContext';
import { DownloadsProvider } from './src/context/DownloadsContext';
import { PlayerProvider } from './src/context/PlayerContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <DownloadsProvider>
          <PlayerProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </PlayerProvider>
        </DownloadsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
