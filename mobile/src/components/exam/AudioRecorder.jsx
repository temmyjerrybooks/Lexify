import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { palette } from '../../theme/colors';

const AudioRecorder = ({ onRecordingComplete, maxDurationSeconds = 120 }) => {
  const [status, setStatus] = useState('idle'); // idle | counting-down | recording | recorded | playing
  const [countdown, setCountdown] = useState(60); // 1-minute preparation time
  const [elapsed, setElapsed] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // FIX [M7a]: Use refs so the unmount cleanup always sees the latest instances,
  // not stale null values captured at mount time by a [] dependency array.
  const recordingRef = useRef(null);
  const soundRef = useRef(null);

  // Pulsing animation for recording indicator
  useEffect(() => {
    if (status === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  // Cleanup on unmount — uses refs to always reach current instances.
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  const startPreparation = async () => {
    // FIX [M7b]: Request mic permission before starting the countdown so the user
    // can grant it without the countdown running in the background.
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      alert('Microphone permission is required for speaking practice.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('counting-down');
    setCountdown(60);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecordingNow = () => {
    clearInterval(timerRef.current);
    startRecording();
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
        isMeteringEnabled: true,
      });

      recordingRef.current = rec;
      setStatus('recording');
      setElapsed(0);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev >= maxDurationSeconds - 1) {
            clearInterval(timerRef.current);
            stopRecording(rec);
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      setStatus('idle');
    }
  };

  const stopRecording = async (rec = recordingRef.current) => {
    clearInterval(timerRef.current);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecordingUri(uri);
      recordingRef.current = null;
      setStatus('recorded');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Pass the recording back to parent with metadata
      onRecordingComplete({ uri, mimeType: 'audio/m4a', durationSeconds: elapsed });
    } catch (err) {
      console.error('Stop recording error:', err);
    }
  };

  const playback = async () => {
    if (!recordingUri) return;
    try {
      // FIX [M7c]: Unload any previous Sound instance before creating a new one
      // to avoid resource leaks when the user replays multiple times.
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      const { sound: s } = await Audio.Sound.createAsync({ uri: recordingUri });
      soundRef.current = s;
      setStatus('playing');
      await s.playAsync();
      s.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (playbackStatus.didJustFinish) {
          setStatus('recorded');
        }
      });
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  const formatTime = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙️ Speaking Response</Text>

      <View style={styles.statusArea}>
        {status === 'idle' && (
          <Text style={styles.instruction}>
            Press the button below to start your 1-minute preparation time, then speak clearly when prompted.
          </Text>
        )}

        {status === 'counting-down' && (
          <View style={styles.countdownArea}>
            <Text style={styles.countdownLabel}>Preparation time</Text>
            <Text style={[styles.countdownNumber, { color: palette.amber400 }]}>{formatTime(countdown)}</Text>
            <TouchableOpacity style={styles.skipButton} onPress={startRecordingNow}>
              <Text style={styles.skipText}>Start Speaking Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'recording' && (
          <View style={styles.recordingArea}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={[styles.recordingTime, { color: palette.red400 }]}>{formatTime(elapsed)}</Text>
            <Text style={styles.maxTime}>/ {formatTime(maxDurationSeconds)} max</Text>
          </View>
        )}

        {status === 'recorded' && (
          <View style={styles.recordedArea}>
            <Text style={[styles.recordedText, { color: palette.teal400 }]}>
              ✓ Recorded ({formatTime(elapsed)})
            </Text>
            <TouchableOpacity onPress={playback}>
              <Text style={styles.playText}>▶ Play back</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'playing' && (
          <Text style={styles.playingText}>▶ Playing...</Text>
        )}
      </View>

      <View style={styles.buttons}>
        {status === 'idle' && (
          <TouchableOpacity style={[styles.mainButton, { backgroundColor: palette.purple500 }]} onPress={startPreparation}>
            <Text style={styles.mainButtonText}>🎙️ Start Preparation (1 min)</Text>
          </TouchableOpacity>
        )}

        {status === 'recording' && (
          <TouchableOpacity style={[styles.mainButton, { backgroundColor: palette.red400 }]} onPress={() => stopRecording()}>
            <Text style={styles.mainButtonText}>⏹ Stop Recording</Text>
          </TouchableOpacity>
        )}

        {status === 'recorded' && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => { setStatus('idle'); setRecordingUri(null); onRecordingComplete(null); }}
          >
            <Text style={styles.secondaryText}>Re-record</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, marginBottom: 4, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1B2F', marginBottom: 16 },
  statusArea: { minHeight: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  instruction: { fontSize: 14, lineHeight: 20, textAlign: 'center', color: '#6B7280' },
  countdownArea: { alignItems: 'center', gap: 8 },
  countdownLabel: { fontSize: 13, color: '#9299B8' },
  countdownNumber: { fontSize: 48, fontWeight: '800' },
  skipButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#6C47FF' },
  skipText: { fontSize: 13, fontWeight: '600', color: '#6C47FF' },
  recordingArea: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordingDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: palette.red400 },
  recordingTime: { fontSize: 32, fontWeight: '800' },
  maxTime: { fontSize: 14, color: '#9299B8' },
  recordedArea: { alignItems: 'center', gap: 8 },
  recordedText: { fontSize: 16, fontWeight: '700' },
  playText: { fontSize: 14, fontWeight: '600', color: '#6C47FF' },
  playingText: { fontSize: 16, fontWeight: '600', color: '#6C47FF' },
  buttons: { gap: 10 },
  mainButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  mainButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
});

export default AudioRecorder;
