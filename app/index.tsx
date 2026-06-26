import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function SplashScreen() {
  const { user, loading, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) return;

    const timer = setTimeout(() => {
      if (user) {
        router.replace('/(main)/map');
      } else {
        router.replace('/(auth)/login');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [initialized, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TUR</Text>
      <ActivityIndicator size="large" color={COLORS.green} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.green,
    letterSpacing: 6,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});
