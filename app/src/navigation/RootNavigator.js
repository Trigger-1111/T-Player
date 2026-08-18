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

const Tab = createBottomTabNavigator();
const PlaylistStack = createNativeStackNavigator();

const darkTheme = {
  dark: true,
  colors: {
    primary: '#2f6fed',
    background: '#000',
    card: '#111113',
    text: '#fff',
    border: '#2c2c2e',
    notification: '#2f6fed',
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
        headerStyle: { backgroundColor: '#111113' },
        headerTintColor: '#fff',
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
    <NavigationContainer theme={darkTheme}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Tab.Navigator
          tabBar={(props) => <TabBarWithMiniPlayer {...props} />}
          screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: '#111113' },
            headerTintColor: '#fff',
            tabBarStyle: { backgroundColor: '#111113', borderTopColor: '#2c2c2e' },
            tabBarActiveTintColor: '#2f6fed',
            tabBarInactiveTintColor: '#888',
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
  safeArea: { flex: 1, backgroundColor: '#000' },
});
