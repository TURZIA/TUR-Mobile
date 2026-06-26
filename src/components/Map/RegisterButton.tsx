import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';
import { CONFIG } from '../../constants/config';
import { useMapStore } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import {
  saveCheckIn,
  getLastCheckIn,
} from '../../services/supabase';
import {
  getHighAccuracyPosition,
  getBestRecentPosition,
} from '../../services/location';
import { haversineMeters } from '../../utils/haversine';
import { doneKey } from '../../utils/formatters';

export function RegisterButton() {
  const user = useAuthStore((s) => s.user);
  const {
    checkpoints,
    nearestCheckpoint,
    isRegistering,
    setIsRegistering,
    markDone,
    isDone,
    setCooldown,
    isCoolingDown,
    doneCheckpoints,
  } = useMapStore();

  if (!user || user.role === 'superadmin') return null;

  const handleRegister = async () => {
    if (!nearestCheckpoint || isRegistering) return;

    const cp = nearestCheckpoint.checkpoint;
    const key = doneKey(cp.raceId, cp.order);

    if (isDone(cp.raceId, cp.order)) {
      Toast.show({ type: 'warning', text1: `${cp.name} — allerede registrert` });
      return;
    }

    if (isCoolingDown(key)) {
      Toast.show({ type: 'warning', text1: 'Vent minst 1 time mellom registreringer' });
      return;
    }

    setIsRegistering(true);

    try {
      // Get best position
      const bestPos = getBestRecentPosition();
      const freshPos = await getHighAccuracyPosition();
      const pos = bestPos && bestPos.accuracy < (freshPos?.accuracy ?? 999) ? bestPos : freshPos;

      if (!pos) {
        Toast.show({ type: 'error', text1: 'Kunne ikke hente posisjon' });
        return;
      }

      const dist = haversineMeters(pos.lat, pos.lng, cp.lat, cp.lng);
      if (dist > CONFIG.MAX_DISTANCE_METERS) {
        Toast.show({
          type: 'error',
          text1: `For langt unna (${Math.round(dist)}m)`,
          text2: `Må være innen ${CONFIG.MAX_DISTANCE_METERS}m`,
        });
        return;
      }

      // Calculate elapsed time from last check-in
      let elapsed: number | null = null;
      try {
        const { data: lastCI } = await getLastCheckIn(user.id, cp.raceId);
        if (lastCI) {
          elapsed = Math.round((Date.now() - new Date(lastCI.timestamp).getTime()) / 1000);
        }
      } catch {}

      await saveCheckIn({
        runner_id: user.id,
        runner_name: user.name,
        checkpoint_name: cp.name,
        checkpoint_order: cp.order,
        lat_recorded: pos.lat,
        lng_recorded: pos.lng,
        accuracy_meters: pos.accuracy,
        elapsed_seconds: elapsed,
        timestamp: new Date().toISOString(),
        race_id: cp.raceId,
      });

      markDone(cp.raceId, cp.order);
      setCooldown(key);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `Registrert! — ${cp.name}` });

      // Check if all checkpoints done
      const allDone = checkpoints.every(
        (c) => doneCheckpoints.has(doneKey(c.raceId, c.order)) || (c.raceId === cp.raceId && c.order === cp.order)
      );
      if (allDone) {
        setTimeout(() => {
          Toast.show({ type: 'success', text1: 'Gratulerer!', text2: 'Du har besøkt alle steder!' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 1500);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Registrering feilet', text2: 'Prøv igjen' });
    } finally {
      setIsRegistering(false);
    }
  };

  // Determine button state
  const getButtonState = () => {
    if (checkpoints.length === 0) {
      return { text: 'Ingen steder lagt til ennå', disabled: true, color: '#9CA3AF' };
    }

    if (!nearestCheckpoint) {
      return { text: 'Henter posisjon…', disabled: true, color: '#9CA3AF' };
    }

    const cp = nearestCheckpoint.checkpoint;
    if (isDone(cp.raceId, cp.order)) {
      return { text: `✓ ${cp.name} — allerede registrert`, disabled: true, color: '#9CA3AF' };
    }

    if (nearestCheckpoint.distance > CONFIG.MAX_DISTANCE_METERS) {
      return {
        text: `${Math.round(nearestCheckpoint.distance)} m fra nærmeste punkt`,
        disabled: true,
        color: '#9CA3AF',
      };
    }

    return { text: 'Registrer posisjon', disabled: false, color: COLORS.green };
  };

  const state = getButtonState();

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: state.color }]}
      onPress={handleRegister}
      disabled={state.disabled || isRegistering}
      activeOpacity={0.85}
    >
      {isRegistering ? (
        <ActivityIndicator color={COLORS.white} size="small" />
      ) : (
        <Text style={styles.text}>{state.text}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  text: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
