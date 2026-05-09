import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { palette } from '../../theme/colors';

const AudioPlayer = ({ audioUrl, autoPlay = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    loadAudio();
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, [audioUrl]);

  const loadAudio = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: autoPlay },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsLoaded(true);
      if (autoPlay) setIsPlaying(true);
    } catch (err) {
      console.warn('Audio load error:', err.message);
      setLoadError(true);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const togglePlayback = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>🎧 LISTENING TRACK</Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: isLoaded ? palette.purple500 : '#E5E7EB' }]}
          onPress={togglePlayback}
          disabled={!isLoaded}
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <View style={styles.progressArea}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      {!isLoaded && !loadError && (
        <Text style={styles.loadingText}>Loading audio...</Text>
      )}
      {loadError && (
        <Text style={styles.loadingText}>⚠️ Audio unavailable for this section.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, marginBottom: 4, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, color: '#9299B8' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  playIcon: { fontSize: 18 },
  progressArea: { flex: 1 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#F0F1F8' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#6C47FF' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { fontSize: 11, color: '#9299B8' },
  loadingText: { fontSize: 12, marginTop: 8, textAlign: 'center', color: '#9299B8' },
});

export default AudioPlayer;
