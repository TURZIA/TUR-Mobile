import * as Location from 'expo-location';
import { CONFIG } from '../constants/config';

export interface Position {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

let watchSubscription: Location.LocationSubscription | null = null;
let bestRecentPos: Position | null = null;
let bestRecentTimer: ReturnType<typeof setTimeout> | null = null;

export async function requestLocationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status;
}

export async function getCurrentPosition(): Promise<Position | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 999,
      timestamp: loc.timestamp,
    };
  } catch {
    return null;
  }
}

export async function getHighAccuracyPosition(): Promise<Position | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 999,
      timestamp: loc.timestamp,
    };
  } catch {
    return null;
  }
}

export function startWatching(
  onPosition: (pos: Position) => void,
  onError?: (err: Error) => void
): void {
  if (watchSubscription) return;

  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 1,
      timeInterval: 1000,
    },
    (loc) => {
      const pos: Position = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? 999,
        timestamp: loc.timestamp,
      };

      // Track best recent position (most accurate in last 10s)
      if (
        !bestRecentPos ||
        pos.accuracy < bestRecentPos.accuracy ||
        pos.timestamp - bestRecentPos.timestamp > CONFIG.BEST_POS_WINDOW_MS
      ) {
        bestRecentPos = pos;
      }

      if (bestRecentTimer) clearTimeout(bestRecentTimer);
      bestRecentTimer = setTimeout(() => {
        bestRecentPos = null;
      }, CONFIG.BEST_POS_WINDOW_MS);

      onPosition(pos);
    }
  )
    .then((sub) => {
      watchSubscription = sub;
    })
    .catch((err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });
}

export function stopWatching(): void {
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }
  if (bestRecentTimer) {
    clearTimeout(bestRecentTimer);
    bestRecentTimer = null;
  }
  bestRecentPos = null;
}

export function getBestRecentPosition(): Position | null {
  return bestRecentPos;
}

export function smoothPosition(
  current: { lat: number; lng: number } | null,
  newPos: Position
): { lat: number; lng: number } {
  if (!current) return { lat: newPos.lat, lng: newPos.lng };

  // EMA with accuracy-based alpha
  const alpha = newPos.accuracy < 10 ? 0.7 : newPos.accuracy < 30 ? 0.4 : 0.25;
  return {
    lat: current.lat + alpha * (newPos.lat - current.lat),
    lng: current.lng + alpha * (newPos.lng - current.lng),
  };
}
