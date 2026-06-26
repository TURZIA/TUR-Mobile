import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { COLORS, SHADOWS } from '@/constants/theme';
import { CONFIG } from '@/constants/config';
import { MapViewComponent, Compass, RegisterButton } from '@/components/Map';
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
import { findNearestCheckpoint, haversineMeters } from '@/utils/haversine';
import { fetchWalkingRoute } from '@/services/osrm';
import { doneKey } from '@/utils/formatters';

export default function MapScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkpoints' }, () => {
        loadCheckpoints();
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

  const handleLogout = async () => {
    stopWatching();
    await logout();
    router.replace('/(auth)/login');
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>TUR</Text>
            <ProgressBadge />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.userName}>{user.name}</Text>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logoutLink}>Logg ut</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {!isSuperAdmin && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push('/(main)/history')}
            >
              <Text style={styles.navBtnText}>Historikk</Text>
            </TouchableOpacity>
          )}
          {isSuperAdmin && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push('/(main)/status')}
            >
              <Text style={styles.navBtnText}>Status</Text>
            </TouchableOpacity>
          )}
          {(isSuperAdmin || isAdmin) && (
            <>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => router.push('/(main)/rapport')}
              >
                <Text style={styles.navBtnText}>Rapport</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => router.push('/(main)/checkpoints')}
              >
                <Text style={styles.navBtnText}>Sjekkpunkter</Text>
              </TouchableOpacity>
            </>
          )}
          {isAdmin && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push('/(main)/participants')}
            >
              <Text style={styles.navBtnText}>Deltakere</Text>
            </TouchableOpacity>
          )}
          {isSuperAdmin && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push('/(main)/admins')}
            >
              <Text style={styles.navBtnText}>Admins</Text>
            </TouchableOpacity>
          )}
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  userName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutLink: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  navBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
});
