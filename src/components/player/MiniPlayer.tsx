import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Image, useColorScheme } from 'react-native';
import { BottomSheet, Button, Host, Group } from '@expo/ui/swift-ui';
import { font, tint, buttonStyle, ignoreSafeArea, presentationBackground, presentationDetents } from '@expo/ui/swift-ui/modifiers';
import { usePlayer } from '@/contexts/PlayerContext';
import { ThemedText } from '@/components/themed-text';
import { SymbolView } from 'expo-symbols';
import FullScreenPlayer from './FullScreenPlayer';
import { GlassView } from 'expo-glass-effect';
import { Colors, PLAYER_SHEET_FRACTION } from '@/constants/theme';

export default function MiniPlayer() {
  const { currentVideo, status, pause, resume, playNext } = usePlayer();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'unspecified' ? 'light' : (colorScheme ?? 'light')];

  if (!currentVideo) return null;

  const isPlaying = status?.playing ?? false;

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  return (
    <>
      <View style={styles.shadowContainer}>
        <GlassView style={styles.glassContainer} glassEffectStyle="regular">
          <Pressable 
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => setIsFullScreen(true)}
          >
            <View style={styles.infoContainer}>
              <ThemedText type="default" numberOfLines={1} style={{ fontWeight: '600' }}>{currentVideo.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {currentVideo.channelName} • {currentVideo.viewCount}
              </ThemedText>
            </View>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 8 }}>
            <Host style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
              <Button 
                label=""
                systemImage={isPlaying ? "pause.fill" : "play.fill"}
                onPress={handlePlayPause}
                modifiers={[font({ size: 24 }), tint(colors.text), buttonStyle('borderless')]}
              />
            </Host>
            <Host style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
              <Button 
                label=""
                systemImage="forward.fill"
                onPress={() => playNext()}
                modifiers={[font({ size: 20 }), tint(colors.text), buttonStyle('borderless')]}
              />
            </Host>
          </View>
        </GlassView>
      </View>

      <Host style={{ position: 'absolute' }} pointerEvents="none" useViewportSizeMeasurement={true}>
        <BottomSheet 
          isPresented={isFullScreen} 
          onIsPresentedChange={setIsFullScreen}
        >
          <Group modifiers={[
            presentationDetents([{ fraction: PLAYER_SHEET_FRACTION }]),
            ignoreSafeArea(),
            presentationBackground('#000000')
          ]}>
            <FullScreenPlayer onClose={() => setIsFullScreen(false)} />
          </Group>
        </BottomSheet>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    position: 'absolute',
    bottom: 90, // Above the tab bar
    left: 8,
    right: 8,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  glassContainer: {
    flex: 1,
    borderRadius: 64, // fully rounded
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  playButton: {
    padding: 12,
  },
});
