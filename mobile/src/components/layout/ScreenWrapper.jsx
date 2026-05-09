import React from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export const ScreenWrapper = ({
  children,
  scrollable = false,
  refreshing = false,
  onRefresh,
  style,
  contentStyle,
  edges = ['top', 'left', 'right'],
  forceLight = false,   // exam screens are always white
  forceDark = false,
}) => {
  const { colors, isDark } = useTheme();

  const effectiveDark = forceDark ? true : forceLight ? false : isDark;
  const bg = forceLight ? '#FFFFFF' : forceDark ? '#0F0F1A' : colors.background;
  const statusBarStyle = effectiveDark ? 'light-content' : 'dark-content';

  if (scrollable) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: bg }, style]} edges={edges}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={bg} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#6C47FF"
                colors={['#6C47FF']}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: bg }, style]} edges={edges}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={bg} />
      <View style={[styles.flex, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
