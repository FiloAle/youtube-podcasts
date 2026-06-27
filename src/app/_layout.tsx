import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import MiniPlayer from '@/components/player/MiniPlayer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SubscriptionProvider>
          <PlayerProvider>
            <AnimatedSplashOverlay />
            <AppTabs />
            <MiniPlayer />
          </PlayerProvider>
        </SubscriptionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
