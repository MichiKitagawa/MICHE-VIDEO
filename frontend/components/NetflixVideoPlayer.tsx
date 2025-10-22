// NetflixVideoPlayer コンポーネント

import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface NetflixVideoPlayerProps {
  videoUrl: string;
  posterUrl?: string;
}

export default function NetflixVideoPlayer({ videoUrl, posterUrl }: NetflixVideoPlayerProps) {
  const { width } = useWindowDimensions();
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);

  const isPlaying = status && 'isPlaying' in status && status.isPlaying;

  const togglePlayPause = () => {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
  };

  const handleRewind = async () => {
    if (status && 'positionMillis' in status) {
      const newPosition = Math.max(0, status.positionMillis - 10000);
      await videoRef.current?.setPositionAsync(newPosition);
    }
  };

  const handleFastForward = async () => {
    if (status && 'positionMillis' in status && 'durationMillis' in status && status.durationMillis) {
      const newPosition = Math.min(status.durationMillis, status.positionMillis + 10000);
      await videoRef.current?.setPositionAsync(newPosition);
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = status && 'positionMillis' in status && 'durationMillis' in status && status.durationMillis
    ? (status.positionMillis / status.durationMillis) * 100
    : 0;

  // デスクトップでは最大幅を制限
  const containerMaxWidth = width >= 1200 ? 1200 : '100%';

  return (
    <View style={[styles.container, { maxWidth: containerMaxWidth }]}>
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          onPlaybackStatusUpdate={setStatus}
          posterSource={posterUrl ? { uri: posterUrl } : undefined}
          usePoster
        />

        {showControls && (
          <View style={styles.controls}>
            <View style={styles.controlsTop}>
              <Text style={styles.liveIndicator}>LIVE</Text>
            </View>

            <View style={styles.controlsCenter}>
              <TouchableOpacity style={styles.controlButton} onPress={handleRewind}>
                <Ionicons name="play-back" size={40} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={56}
                  color="#FFF"
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={handleFastForward}>
                <Ionicons name="play-forward" size={40} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.controlsBottom}>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
              </View>

              <View style={styles.timeContainer}>
                {status && 'positionMillis' in status && 'durationMillis' in status && status.durationMillis && (
                  <>
                    <Text style={styles.timeText}>
                      {formatTime(status.positionMillis)}
                    </Text>
                    <Text style={styles.timeText}> / </Text>
                    <Text style={styles.timeText}>
                      {formatTime(status.durationMillis)}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.text,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  controlsTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  liveIndicator: {
    display: 'none', // 将来的に使用
  },
  controlsCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsBottom: {
    padding: 16,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
