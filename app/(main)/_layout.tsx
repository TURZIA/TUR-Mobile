import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.green,
        headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
        headerBackTitle: 'Tilbake',
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="checkpoints" options={{ title: 'Sjekkpunkter' }} />
      <Stack.Screen name="new-race" options={{ title: 'Ny tur' }} />
      <Stack.Screen name="map-picker" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="participants" options={{ title: 'Deltakere' }} />
      <Stack.Screen name="admins" options={{ title: 'Administratorer' }} />
      <Stack.Screen name="status" options={{ title: 'Status' }} />
    </Stack>
  );
}
