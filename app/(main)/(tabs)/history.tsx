import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useMapStore } from '@/stores/mapStore';
import {
  getCheckInsByRunner,
  getWinnersByRunner,
  type CheckIn,
  type Winner,
} from '@/services/supabase';
import { formatDate, formatTime } from '@/utils/formatters';

export default function HistoryScreen() {
  const user = useAuthStore((s) => s.user);
  const races = useMapStore((s) => s.races);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const raceName = (raceId: string) =>
    races.find((r) => r.race_id === raceId)?.name || raceId;

  const loadData = async () => {
    if (!user) return;
    try {
      const [ciRes, winRes] = await Promise.all([
        getCheckInsByRunner(user.id),
        getWinnersByRunner(user.id, user.name),
      ]);
      setCheckIns(ciRes.data || []);
      setWinners(winRes.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const winnerRaceIds = new Set(winners.flatMap((w) => w.race_ids || []));

  // Group check-ins by race
  const grouped: Record<string, CheckIn[]> = {};
  for (const ci of checkIns) {
    const key = ci.race_id || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ci);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.green} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />
      }
    >
      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.green} />
          <Text style={styles.statValue}>{checkIns.length}</Text>
          <Text style={styles.statLabel}>Registreringer</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={22} color={COLORS.purple} />
          <Text style={styles.statValue}>{winners.length}</Text>
          <Text style={styles.statLabel}>Premier</Text>
        </View>
      </View>

      {/* History entries */}
      {Object.keys(grouped).length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="walk-outline" size={48} color={COLORS.muted} />
          <Text style={styles.empty}>Ingen registreringer ennå</Text>
          <Text style={styles.emptyHint}>
            Besøk et tursted og registrer posisjonen din for å komme i gang.
          </Text>
        </View>
      ) : (
        Object.entries(grouped).map(([raceId, entries]) => (
          <View key={raceId} style={styles.group}>
            <Text style={styles.groupTitle}>
              {raceId !== 'unknown' ? raceName(raceId) : 'Ukjent tur'}
            </Text>
            {entries.map((ci, idx) => {
              const isWinner = winnerRaceIds.has(ci.race_id);
              return (
                <View key={ci.id ?? idx} style={styles.entry}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isWinner ? COLORS.purple : COLORS.green },
                    ]}
                  />
                  <View style={styles.entryContent}>
                    <Text style={styles.entryName}>{ci.checkpoint_name}</Text>
                    <Text style={styles.entryDate}>
                      {formatDate(ci.timestamp)} · {formatTime(ci.timestamp)}
                    </Text>
                  </View>
                  {isWinner && (
                    <View style={styles.winnerBadge}>
                      <Ionicons name="trophy" size={11} color={COLORS.white} />
                      <Text style={styles.winnerText}>Vinner</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    ...SHADOWS.sm,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 48, paddingHorizontal: 32 },
  empty: { color: COLORS.text2, fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyHint: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  group: { marginBottom: 24 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text2,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  entryContent: { flex: 1 },
  entryName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  entryDate: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.purple,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  winnerText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
});
