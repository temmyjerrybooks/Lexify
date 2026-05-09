import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../theme/ThemeContext';

import HomeScreen from '../screens/home/HomeScreen';
import DailyChallengeScreen from '../screens/home/DailyChallengeScreen';
import ExamListScreen from '../screens/exams/ExamListScreen';
import MockExamScreen from '../screens/exams/MockExamScreen';
import ResultsScreen from '../screens/results/ResultsScreen';
import ReviewAnswersScreen from '../screens/results/ReviewAnswersScreen';
import AnalyticsScreen from '../screens/results/AnalyticsScreen';
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SubscriptionScreen from '../screens/profile/SubscriptionScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="DailyChallenge" component={DailyChallengeScreen} />
  </Stack.Navigator>
);

const ExamStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExamList" component={ExamListScreen} />
    <Stack.Screen name="MockExam" component={MockExamScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Results" component={ResultsScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="ReviewAnswers" component={ReviewAnswersScreen} />
  </Stack.Navigator>
);

const AnalyticsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
  </Stack.Navigator>
);

const LeaderboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const TAB_ICONS = {
  HomeTab:        { active: 'home',      inactive: 'home-outline' },
  ExamsTab:       { active: 'book',      inactive: 'book-outline' },
  AnalyticsTab:   { active: 'bar-chart', inactive: 'bar-chart-outline' },
  LeaderboardTab: { active: 'trophy',    inactive: 'trophy-outline' },
  ProfileTab:     { active: 'person',    inactive: 'person-outline' },
};

const MainNavigator = () => {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { borderTopColor: theme.border }],
        tabBarBackground: () => (
          <BlurView
            intensity={theme.isDark ? 60 : 80}
            tint={theme.tabBarTint}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: '#6C47FF',
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const { active, inactive } = TAB_ICONS[route.name];
          return (
            <View style={styles.tabIconWrap}>
              <Ionicons name={focused ? active : inactive} size={22} color={color} />
              {focused && <View style={styles.tabDot} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab"        component={HomeStack}        options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="ExamsTab"       component={ExamStack}        options={{ tabBarLabel: 'Tests' }} />
      <Tab.Screen name="AnalyticsTab"   component={AnalyticsStack}   options={{ tabBarLabel: 'Results' }} />
      <Tab.Screen name="LeaderboardTab" component={LeaderboardStack} options={{ tabBarLabel: 'Ranks' }} />
      <Tab.Screen name="ProfileTab"     component={ProfileStack}     options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};

export default MainNavigator;

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  tabLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  tabIconWrap: { alignItems: 'center', gap: 4 },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6C47FF' },
});
