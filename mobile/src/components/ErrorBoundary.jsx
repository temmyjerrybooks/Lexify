import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Tap below to try recovering.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  emoji:   { fontSize: 48, marginBottom: 16 },
  title:   { fontSize: 22, fontWeight: '800', color: '#1A1B2F', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  button:  { paddingHorizontal: 28, paddingVertical: 14, backgroundColor: '#6C47FF', borderRadius: 14 },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default ErrorBoundary;
