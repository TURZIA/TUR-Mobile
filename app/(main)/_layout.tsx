import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="map" />
      <Stack.Screen name="history" options={{ presentation: 'modal' }} />
      <Stack.Screen name="rapport" />
      <Stack.Screen name="checkpoints" />
      <Stack.Screen name="new-race" />
      <Stack.Screen name="participants" />
      <Stack.Screen name="admins" />
      <Stack.Screen name="status" options={{ presentation: 'modal' }} />
      <Stack.Screen name="map-picker" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
