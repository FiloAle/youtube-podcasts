import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Text, Alert } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { youtubeService, VideoInfo } from '@/lib/youtube';

interface PlayerContextType {
  currentVideo: VideoInfo | null;
  playVideo: (video: VideoInfo) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seekTo: (time: number) => void;
  status: any;
  isLoading: boolean;
  player: any;
  queue: VideoInfo[];
  addToQueue: (video: VideoInfo) => void;
  removeFromQueue: (index: number) => void;
  playNext: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState<VideoInfo[]>([]);
  const [pendingPlay, setPendingPlay] = useState(false);

  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFallbackUrl, setActiveFallbackUrl] = useState<string | null>(null);
  const fallbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = React.useRef<VideoInfo[]>([]);
  const playNextLock = React.useRef(false);

  const statusRef = React.useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const playNext = async () => {
    // Evita chiamate multiple (il player potrebbe mandare decine di update di fine video in un secondo)
    if (playNextLock.current) return;
    playNextLock.current = true;
    
    // Sblocca automaticamente dopo 5 secondi (tempo più che sufficiente per caricare il nuovo video)
    setTimeout(() => {
      playNextLock.current = false;
    }, 5000);
    
    if (queueRef.current.length > 0) {
      const nextVideo = queueRef.current[0];
      
      // Update both state and ref
      queueRef.current = queueRef.current.slice(1);
      setQueue(queueRef.current);
      
      showToast("Riproduco da coda: " + nextVideo.title);
      await playVideo(nextVideo);
    } else {
      player.pause();
      player.seekTo(0);
    }
  };

  // Execute fallback if the timer completes and sets activeFallbackUrl
  useEffect(() => {
    if (activeFallbackUrl) {
      console.log("Fallback triggered");
      showToast("Avvio lento, provo stream alternativo...");
      player.replace(activeFallbackUrl);
      player.play();
      setActiveFallbackUrl(null); // Reset
    }
  }, [activeFallbackUrl, player]);

  // Handle general player status updates
  useEffect(() => {
    if (status) {
      if (status.error) {
        Alert.alert("Errore Riproduzione", "Il player nativo ha rifiutato lo stream audio.");
        setCurrentVideo(null);
      } else {
        const actualDuration = (currentVideo?.durationSeconds && currentVideo.durationSeconds > 0) 
          ? currentVideo.durationSeconds 
          : (status.duration ?? 0);

        if (status.didJustFinish) {
          playNext();
        } else if (status.currentTime > 0 && actualDuration > 0 && status.currentTime >= actualDuration - 0.1) {
          playNext();
        }
      }
    }
  }, [status?.currentTime, status?.duration, status?.didJustFinish, status?.error, currentVideo]);

  const addToQueue = (video: VideoInfo) => {
    queueRef.current = [...queueRef.current, video];
    setQueue(queueRef.current);
    showToast(`"${video.title}" aggiunto alla coda`);
  };

  const removeFromQueue = (index: number) => {
    const newQueue = [...queueRef.current];
    newQueue.splice(index, 1);
    queueRef.current = newQueue;
    setQueue(newQueue);
  };

  const playVideo = async (video: VideoInfo) => {
    setIsLoading(true);
    setCurrentVideo(video);
    setActiveFallbackUrl(null); // Reset fallback state
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    try {
      const streamInfo = await youtubeService.getAudioStream(video.videoId);
      if (streamInfo && streamInfo.url) {
        player.replace(streamInfo.url);
        player.play();
        player.setActiveForLockScreen(true, {
          title: video.title,
          artist: video.channelName || "YouTube Podcast",
          artworkUrl: video.thumbnailUrl,
          durationSeconds: video.durationSeconds
        } as any, {
          isLiveStream: false,
          showSeekForward: true,
          showSeekBackward: true
        });

        // Set fallback timer to 3.5 seconds
        if (streamInfo.fallbackUrl) {
          const fallback = streamInfo.fallbackUrl;
          fallbackTimerRef.current = setTimeout(() => {
            const currentStatus = statusRef.current;
            // Se dopo 3.5 secondi siamo ancora a meno di 0.5s di riproduzione, vuol dire che il player è impallato sul buffering iniziale
            if (!currentStatus || currentStatus.currentTime < 0.5) {
              setActiveFallbackUrl(fallback);
            }
          }, 3500);
        }
      } else {
        Alert.alert("Errore", "Nessun flusso audio trovato.");
        setCurrentVideo(null);
      }
    } catch (e: any) {
      Alert.alert("Errore", e.message || "Impossibile riprodurre.");
      setCurrentVideo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const pause = () => {
    player.pause();
  };

  const resume = () => {
    player.play();
  };

  const seekTo = (time: number) => {
    player.seekTo(time);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentVideo,
        playVideo,
        pause,
        resume,
        seekTo,
        status,
        isLoading,
        player,
        queue,
        addToQueue,
        removeFromQueue,
        playNext,
      }}
    >
      {children}
      {toastMessage && (
        <View style={{
          position: 'absolute',
          bottom: 100,
          left: 20,
          right: 20,
          backgroundColor: '#333',
          padding: 16,
          borderRadius: 12,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 5,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }} numberOfLines={2}>
            {toastMessage}
          </Text>
        </View>
      )}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
