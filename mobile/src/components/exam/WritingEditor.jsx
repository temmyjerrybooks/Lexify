import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { palette } from '../../theme/colors';

const WritingEditor = ({ value, onChangeText, minWords = 150 }) => {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const isUnder = wordCount < minWords;
  const isAtTarget = wordCount >= minWords && wordCount < minWords * 1.5;

  const countColor = isUnder ? palette.red400 : isAtTarget ? palette.teal400 : palette.amber400;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>✍️ Your Answer</Text>
        <Text style={[styles.wordCount, { color: countColor }]}>
          {wordCount} / {minWords} words {isUnder ? '(minimum)' : '✓'}
        </Text>
      </View>

      <TextInput
        style={styles.editor}
        multiline
        placeholder={`Write at least ${minWords} words. Your response will be scored by AI...`}
        placeholderTextColor="#C4C9DF"
        value={value}
        onChangeText={onChangeText}
        textAlignVertical="top"
        autoCorrect={false}
        spellCheck={true}
      />

      {/* Word count progress bar */}
      <View style={styles.progressTrack}>
        <View style={[
          styles.progressFill,
          {
            width: `${Math.min(100, (wordCount / minWords) * 100)}%`,
            backgroundColor: countColor,
          }
        ]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F9FAFB',
  },
  headerText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  wordCount: { fontSize: 12, fontWeight: '700' },
  editor: { padding: 14, fontSize: 15, lineHeight: 22, minHeight: 200, color: '#1A1B2F' },
  progressTrack: { height: 3, backgroundColor: '#F0F1F8' },
  progressFill: { height: 3 },
});

export default WritingEditor;
