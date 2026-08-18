import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MiniPlayer from '../components/MiniPlayer';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const PlaylistStack = createNativeStackNavigator();

const appTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {},
};

const icons = { Search: '🔍', Library: '🎵', Playlists: '📃', Settings: '⚙️' };

function TabIcon({ name, focused }) {
  return <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{icons[name]}</Text>;
}

function PlaylistsStackNavigator() {
  return (
    <PlaylistStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
      }}
    >
      <PlaylistStack.Screen name="PlaylistsHome" component={PlaylistsScreen} options={{ title: '플레이리스트' }} />
      <PlaylistStack.Screen
        name="PlaylistDetail"
        component={PlaylistDetailScreen}
        options={({ route }) => ({ title: route.params?.name ?? '플레이리스트' })}
      />
    </PlaylistStack.Navigator>
  );
}

function TabBarWithMiniPlayer(props) {
  return (
    <View>
      <MiniPlayer />
      <BottomTabBar {...props} />
    </View>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={appTheme}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Tab.Navigator
          tabBar={(props) => <TabBarWithMiniPlayer {...props} />}
          screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          })}
        >
          <Tab.Screen name="Search" component={SearchScreen} options={{ title: '검색' }} />
          <Tab.Screen name="Library" component={LibraryScreen} options={{ title: '라이브러리' }} />
          <Tab.Screen name="Playlists" component={PlaylistsStackNavigator} options={{ title: '플레이리스트', headerShown: false }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
        </Tab.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
});
