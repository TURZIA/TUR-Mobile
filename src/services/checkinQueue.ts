import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { saveCheckIn, type CheckIn } from './supabase';

// Check-ins made without connectivity are stored here and re-sent when
// the device comes back online. Important for use in areas with poor
// coverage (mountains, forests).
const QUEUE_KEY = 'tur_pending_checkins';

type PendingCheckIn = Omit<CheckIn, 'id'>;

let flushing = false;

async function readQueue(): Promise<PendingCheckIn[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingCheckIn[]) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export async function queueCheckIn(checkIn: PendingCheckIn) {
  const queue = await readQueue();
  queue.push(checkIn);
  await writeQueue(queue);
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length;
}

/** Try to send everything in the queue. Returns how many were sent. */
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  try {
    const queue = await readQueue();
    if (queue.length === 0) return 0;

    const remaining: PendingCheckIn[] = [];
    let sent = 0;
    for (const ci of queue) {
      const { error } = await saveCheckIn(ci);
      if (error) {
        remaining.push(ci);
      } else {
        sent++;
      }
    }
    await writeQueue(remaining);
    return sent;
  } finally {
    flushing = false;
  }
}

/** Start listening for connectivity and flush when back online. */
export function startQueueListener(onFlushed?: (sent: number) => void): () => void {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      const sent = await flushQueue();
      if (sent > 0) onFlushed?.(sent);
    }
  });
  return unsubscribe;
}
