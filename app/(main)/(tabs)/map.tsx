import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { COLORS, SHADOWS } from '@/constants/theme';
import { CONFIG } from '@/constants/config';
import { MapViewComponent, Compass, RegisterButton, CheckInSuccessModal } from '@/components/Map';
import { GpsBar, OfflineBanner, ProgressBadge, LinkAdminModal } from '@/components/UI';
import { useAuthStore } from '@/stores/authStore';
import { useMapStore } from '@/stores/mapStore';
import {
  requestLocationPermission,
  startWatching,
  stopWatching,
  smoothPosition,
} from '@/services/location';
import { supabase } from '@/services/supabase';
import { startQueueListener } from '@/services/checkinQueue';
import {
  requestNotificationPermission,
  notify,
  scheduleWeeklyReminder,
} from '@/services/notifications';
import { findNearestCheckpoint, haversineMeters } from '@/utils/haversine';
import { fetchWalkingRoute } from '@/services/osrm';
import { doneKey } from '@/utils/formatters';

export default function MapScreen() {
  const user = useAuthStore((s) => s.user);
  const {
    checkpoints,
    doneCheckpoints,
    loadCheckpoints,
    loadHistory,
    setPosition,
    setSmoothedPosition,
    setGpsStatus,
    setRouteCoords,
    setNearestCheckpoint,
    smoothedPosition,
    loadCooldowns,
  } = useMapStore();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const lastRoutePos = useRef<{ lat: number; lng: number } | null>(null);
  const routeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proximityAlerted = useRef<Set<string>>(new Set());

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';
  const isRunner = user?.role === 'runner';

  // Initialize data
  useEffect(() => {
    if (!user) return;

    loadCheckpoints();
    loadCooldowns();

    if (user.role !== 'superadmin') {
      loadHistory(user.id);
    }

    // Check if runner needs admin link
    if (isRunner && !user.raceId) {
      setShowLinkModal(true);
    }
  }, [user?.id]);

  // Notifications: permission + weekly reminder for runners
  useEffect(() => {
    if (!isRunner) return;
    (async () => {
      const granted = await requestNotificationPermission();
      if (granted) scheduleWeeklyReminder();
    })();
  }, [isRunner]);

  // Re-send check-ins that were made offline
  useEffect(() => {
    if (!user || isSuperAdmin) return;
    const unsubscribe = startQueueListener((sent) => {
      Toast.show({
        type: 'success',
        text1: `${sent} offline-registrering${sent > 1 ? 'er' : ''} sendt`,
      });
      loadHistory(user.id);
    });
    return unsubscribe;
  }, [user?.id]);

  // Start GPS tracking
  useEffect(() => {
    if (isSuperAdmin) return;

    let mounted = true;

    const initGps = async () => {
      const status = await requestLocationPermission();
      if (status !== 'granted') {
        setGpsStatus('denied');
        Toast.show({ type: 'error', text1: 'GPS-tilgang nektet', text2: 'Aktiver posisjon i innstillinger' });
        return;
      }

      setGpsStatus('loading');

      startWatching(
        (pos) => {
          if (!mounted) return;

          setPosition(pos);
          const smoothed = smoothPosition(useMapStore.getState().smoothedPosition, pos);
          setSmoothedPosition(smoothed);

          if (pos.accuracy < 20) setGpsStatus('good');
          else if (pos.accuracy < 50) setGpsStatus('weak');
          else setGpsStatus('weak');

          // Update nearest checkpoint
          const cps = useMapStore.getState().checkpoints;
          const done = useMapStore.getState().doneCheckpoints;
          const nearest = findNearestCheckpoint(smoothed.lat, smoothed.lng, cps, done);
          setNearestCheckpoint(nearest);

          // Proximity alert
          if (nearest && nearest.distance <= CONFIG.PROXIMITY_ALERT_METERS) {
            const key = doneKey(nearest.checkpoint.raceId, nearest.checkpoint.order);
            if (!proximityAlerted.current.has(key) && !done.has(key)) {
              proximityAlerted.current.add(key);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Toast.show({
                type: 'success',
                text1: `${Math.round(nearest.distance)} m til ${nearest.checkpoint.name}`,
              });
            }
          }

          // Update route
          updateRoute(smoothed.lat, smoothed.lng);
        },
        (err) => {
          setGpsStatus('denied');
        }
      );
    };

    initGps();

    return () => {
      mounted = false;
      stopWatching();
    };
  }, [isSuperAdmin]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('live-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'check_ins', filter: `runner_id=eq.${user.id}` }, () => {
        loadHistory(user.id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkpoints' }, (payload: any) => {
        loadCheckpoints();
        if (user.role === 'runner') {
          notify('Nytt tursted! 🏔', `${payload.new?.name ?? 'Et nytt sted'} er lagt til — kom deg ut!`);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'checkpoints' }, () => {
        loadCheckpoints();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'races' }, () => {
        loadCheckpoints();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'winners' }, (payload: any) => {
        if (payload.new?.winner_id === user.id) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          notify('Du er vinner! 🏆', 'Gratulerer med seieren i månedens trekning!');
          Toast.show({
            type: 'success',
            text1: 'Du er vinner!',
            text2: 'Gratulerer med seieren!',
            visibilityTime: 6000,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const updateRoute = useCallback(
    (lat: number, lng: number) => {
      if (isSuperAdmin) return;

      const cps = useMapStore.getState().checkpoints;
      const done = useMapStore.getState().doneCheckpoints;
      const nearest = findNearestCheckpoint(lat, lng, cps, done);

      if (!nearest) {
        setRouteCoords(null);
        return;
      }

      // Check if we've moved enough to refetch
      if (lastRoutePos.current) {
        const moved = haversineMeters(lat, lng, lastRoutePos.current.lat, lastRoutePos.current.lng);
        if (moved < CONFIG.OSRM_MIN_MOVE_METERS) return;
      }

      lastRoutePos.current = { lat, lng };

      if (routeDebounce.current) clearTimeout(routeDebounce.current);
      routeDebounce.current = setTimeout(async () => {
        const route = await fetchWalkingRoute(lat, lng, nearest.checkpoint.lat, nearest.checkpoint.lng);
        if (route) {
          setRouteCoords(route.coordinates);
        }
      }, CONFIG.OSRM_DEBOUNCE_MS);
    },
    [isSuperAdmin]
  );

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>TUR</Text>
            {!isSuperAdmin && <ProgressBadge />}
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name}
          </Text>
        </View>
      </View>

      {/* GPS Bar */}
      {!isSuperAdmin && <GpsBar />}

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapViewComponent />
        <Compass />
      </View>

      {/* Register Button */}
      <RegisterButton />

      {/* Check-in celebration */}
      <CheckInSuccessModal />

      {/* Link Admin Modal */}
      <LinkAdminModal
        visible={showLinkModal}
        onLinked={() => {
          setShowLinkModal(false);
          loadCheckpoints();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  userName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 160,
  },
  mapContainer: {
    flex: 1,
  },
});
