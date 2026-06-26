import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { Button } from '@/components/UI/Button';
import { useAuthStore } from '@/stores/authStore';
import { useMapStore } from '@/stores/mapStore';
import {
  getCheckInsByRunner,
  getWinnersByRunner,
  updateRunnerAdmin,
  type CheckIn,
  type Winner,
} from '@/services/supabase';
import { formatDate, formatTime } from '@/utils/formatters';

export default function HistoryScreen() {
  const user = useAuthStore((s) => s.user);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ciRes, winRes] = await Promise.all([
        getCheckInsByRunner(user.id),
        getWinnersByRunner(user.id, user.name),
      ]);
      setCheckIns(ciRes.data || []);
      setWinners(winRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAdmin = async () => {
    if (!user) return;
    const prevCode = user.raceId;
    await updateRunnerAdmin(user.id, null, prevCode ?? undefined);
    useAuthStore.getState().setUser({ ...user, raceId: null });
    router.back();
  };

  const winnerRaceIds = new Set(winners.flatMap((w) => w.race_ids || []));

  // Group check-ins by race
  const grouped: Record<string, CheckIn[]> = {};
  for (const ci of checkIns) {
    const key = ci.race_id || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ci);
  }

  const isRunner = user?.role === 'runner';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historikk</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* User info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoName}>{user?.name}</Text>
            {user?.adminCode && (
              <Text style={styles.infoCode}>Arrangørkode: {user.adminCode}</Text>
            )}
            <Text style={styles.infoStat}>
              Totalt {checkIns.length} registreringer · {winners.length} premier
            </Text>
          </View>

          {/* Change admin button */}
          {isRunner && (
            <Button
              title="Bytt arrangør"
              variant="outline"
              onPress={handleChangeAdmin}
              style={{ marginBottom: 20 }}
            />
          )}

          {/* History entries */}
          {Object.keys(grouped).length === 0 ? (
            <Text style={styles.empty}>Ingen registreringer ennå</Text>
          ) : (
            Object.entries(grouped).map(([raceId, entries]) => (
              <View key={raceId} style={styles.group}>
                <Text style={styles.groupTitle}>{entries[0]?.race_id || 'Ukjent tur'}</Text>
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: COLORS.surface,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  close: { fontSize: 22, color: COLORS.muted, padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  infoName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  infoCode: { fontSize: 13, color: COLORS.muted, marginBottom: 4 },
  infoStat: { fontSize: 14, color: COLORS.text2 },
  empty: { textAlign: 'center', color: COLORS.muted, fontSize: 15, marginTop: 40 },
  group: { marginBottom: 24 },
  groupTitle: {
    fontSize: 14,
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
    backgroundColor: COLORS.purple,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  winnerText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
});
