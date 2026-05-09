import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../../theme/colors';

const ExamTimer = ({ seconds }) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isWarning = seconds < 300;  // Red when < 5 minutes
  const isCritical = seconds < 60;  // Pulse when < 1 minute

  const color = isCritical ? palette.red400 : isWarning ? palette.amber400 : palette.purple500;

  return (
    <View style={[styles.container, { borderColor: color + '30', backgroundColor: color + '10' }]}>
      <Text style={[styles.text, { color }]}>
        ⏱ {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

export default ExamTimer;
