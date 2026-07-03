import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Local notifications: winner announcements and new-race alerts fire from
// realtime events while the app is running; the weekly reminder is a
// scheduled repeating notification.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TUR',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const { granted } = await Notifications.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

export async function notify(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // immediately
    });
  } catch {}
}

const WEEKLY_KEY = 'tur_weekly_reminder_v1';

/** Sunday 18:00 reminder for runners; scheduled once. */
export async function scheduleWeeklyReminder() {
  try {
    const already = await AsyncStorage.getItem(WEEKLY_KEY);
    if (already) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'På tide med en tur? 🏔',
        body: 'Du har ikke registrert noe denne uken. Kom deg ut!',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 18,
        minute: 0,
      },
    });
    await AsyncStorage.setItem(WEEKLY_KEY, '1');
  } catch {}
}

export async function cancelAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(WEEKLY_KEY);
  } catch {}
}
