import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import MiniPlayer from '../components/MiniPlayer';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const Tab = createBottomTabNavigator();
const PlaylistStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

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
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: '400' },
    medium: { fontFamily: fonts.medium, fontWeight: '500' },
    bold: { fontFamily: fonts.bold, fontWeight: '700' },
    heavy: { fontFamily: fonts.extraBold, fontWeight: '800' },
  },
};

const tabIconNames = {
  Search: 'search',
  Library: 'musical-notes',
  Playlists: 'albums',
  Settings: 'settings',
};

function TabIcon({ name, focused, color }) {
  const iconName = tabIconNames[name];
  return <Ionicons name={focused ? iconName : `${iconName}-outline`} size={22} color={color} />;
}

const stackHeaderOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18 },
};

function PlaylistsStackNavigator() {
  return (
    <PlaylistStack.Navigator screenOptions={stackHeaderOptions}>
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

function MainTabs() {
  // The previous fixed height (58) ignored the device's bottom safe-area
  // inset, so on gesture-nav phones the tab bar sat right on top of the
  // system back-gesture strip and taps landed on the OS gesture instead of
  // our icons. Pad it out using the real inset so the tappable icons always
  // clear that area, with a floor so three-button-nav phones still get a
  // comfortably tall bar.
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + Math.max(insets.bottom, 24);

  return (
    <Tab.Navigator
      tabBar={(props) => <TabBarWithMiniPlayer {...props} />}
      screenOptions={({ route }) => ({
        ...stackHeaderOptions,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 24),
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 11 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused, color }) => <TabIcon name={route.name} focused={focused} color={color} />,
      })}
    >
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: '검색' }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ title: '라이브러리' }} />
      <Tab.Screen name="Playlists" component={PlaylistsStackNavigator} options={{ title: '플레이리스트', headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={appTheme}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          <RootStack.Screen
            name="NowPlaying"
            component={NowPlayingScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </RootStack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
});
