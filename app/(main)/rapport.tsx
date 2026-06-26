import React, { useState, useEffect } from 'react';
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
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { Button } from '@/components/UI/Button';
import { useAuthStore } from '@/stores/authStore';
import {
  getAllAdmins,
  getRacesByAdmin,
  getCheckInsByDateRange,
  getWinner,
  saveWinner,
  getActiveRaces,
  getCheckpointsByRaceIds,
  type Admin,
  type Race,
  type CheckIn,
  type Winner,
} from '@/services/supabase';
import { getMonthRange, formatDate } from '@/utils/formatters';

interface LeaderboardEntry {
  name: string;
  runnerId: string;
  checkpoints: number;
  total: number;
  raceIds: string[];
}

export default function RapportScreen() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'superadmin';

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [drawingWinner, setDrawingWinner] = useState(false);
  const [totalCheckpoints, setTotalCheckpoints] = useState(0);

  useEffect(() => {
    const { from, to } = getMonthRange();
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);

    if (isSuperAdmin) {
      loadAdmins();
    } else if (user?.adminCode) {
      setSelectedAdmin(user.adminCode);
      loadRaces(user.adminCode);
    }
  }, []);

  useEffect(() => {
    if (selectedAdmin) {
      loadRaces(selectedAdmin);
      generateReport();
    }
  }, [selectedAdmin]);

  const loadAdmins = async () => {
    const { data } = await getAllAdmins();
    setAdmins(data || []);
    if (data?.length) {
      setSelectedAdmin(data[0].admin_code);
    }
  };

  const loadRaces = async (adminCode: string) => {
    const { data } = await getRacesByAdmin(adminCode);
    setRaces(data || []);
  };

  const generateReport = async () => {
    if (!selectedAdmin) return;
    setLoading(true);

    try {
      const from = new Date(dateFrom).toISOString();
      const to = new Date(dateTo + 'T23:59:59').toISOString();

      const { data: checkIns } = await getCheckInsByDateRange(from, to, selectedRace || undefined);
      if (!checkIns?.length) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Filter by admin's races
      const { data: adminRaces } = await getRacesByAdmin(selectedAdmin);
      const adminRaceIds = new Set((adminRaces || []).map((r) => r.race_id));
      const filtered = checkIns.filter((ci) => adminRaceIds.has(ci.race_id));

      // Get total checkpoints
      const { data: cps } = await getCheckpointsByRaceIds(Array.from(adminRaceIds));
      setTotalCheckpoints(cps?.length || 0);

      // Build leaderboard
      const runnerMap: Record<string, LeaderboardEntry> = {};
      for (const ci of filtered) {
        if (!runnerMap[ci.runner_id]) {
          runnerMap[ci.runner_id] = {
            name: ci.runner_name,
            runnerId: ci.runner_id,
            checkpoints: 0,
            total: 0,
            raceIds: [],
          };
        }
        const entry = runnerMap[ci.runner_id];
        entry.checkpoints++;
        entry.total += ci.elapsed_seconds || 0;

        if (!entry.raceIds.includes(ci.race_id)) {
          entry.raceIds.push(ci.race_id);
        }
      }

      const sorted = Object.values(runnerMap).sort((a, b) => b.checkpoints - a.checkpoints);
      setLeaderboard(sorted);

      // Check existing winner
      const now = new Date();
      const { data: existingWinner } = await getWinner(now.getMonth() + 1, now.getFullYear(), selectedAdmin);
      setWinner(existingWinner || null);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Kunne ikke generere rapport' });
    } finally {
      setLoading(false);
    }
  };

  const handleDrawWinner = async () => {
    if (winner) {
      Toast.show({ type: 'warning', text1: 'Vinner allerede trukket denne måneden' });
      return;
    }

    const eligible = leaderboard.filter((e) => e.checkpoints >= totalCheckpoints && totalCheckpoints > 0);
    if (eligible.length === 0) {
      Toast.show({ type: 'warning', text1: 'Ingen kvalifiserte deltakere', text2: 'Alle sjekkpunkter må besøkes' });
      return;
    }

    setDrawingWinner(true);
    try {
      const selected = eligible[Math.floor(Math.random() * eligible.length)];
      const now = new Date();

      const winnerData = {
        winner_name: selected.name,
        winner_id: selected.runnerId,
        admin_code: selectedAdmin,
        race_ids: selected.raceIds,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        period_from: dateFrom,
        period_to: dateTo,
        drawn_at: now.toISOString(),
      };

      const { error } = await saveWinner(winnerData);
      if (error) {
        if (error.code === '23505') {
          Toast.show({ type: 'warning', text1: 'Vinner allerede trukket denne måneden' });
        } else {
          Toast.show({ type: 'error', text1: 'Kunne ikke lagre vinner' });
        }
        return;
      }

      setWinner(winnerData as Winner);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `Vinner: ${selected.name}!` });
    } finally {
      setDrawingWinner(false);
    }
  };

  const handleExport = async () => {
    try {
      let csv = 'Rank,Navn,Sjekkpunkter,Total tid\n';
      leaderboard.forEach((entry, i) => {
        csv += `${i + 1},${entry.name},${entry.checkpoints}/${totalCheckpoints},${entry.total}s\n`;
      });

      const fileUri = FileSystem.documentDirectory + 'tur-rapport.csv';
      await FileSystem.writeAsStringAsync(fileUri, csv);
      await Sharing.shareAsync(fileUri);
    } catch {
      Toast.show({ type: 'error', text1: 'Kunne ikke eksportere rapport' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Tilbake</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Rapport</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Admin selector for super admin */}
        {isSuperAdmin && admins.length > 0 && (
          <View style={styles.selectorRow}>
            <Text style={styles.label}>Arrangør:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {admins.map((a) => (
                <TouchableOpacity
                  key={a.admin_code}
                  style={[styles.chip, selectedAdmin === a.admin_code && styles.chipActive]}
                  onPress={() => setSelectedAdmin(a.admin_code)}
                >
                  <Text
                    style={[styles.chipText, selectedAdmin === a.admin_code && styles.chipTextActive]}
                  >
                    {a.email.split('@')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Button
          title="Generer rapport"
          onPress={generateReport}
          loading={loading}
          style={{ marginBottom: 16 }}
        />

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.rankCol]}>#</Text>
              <Text style={[styles.tableCell, styles.nameCol]}>Navn</Text>
              <Text style={[styles.tableCell, styles.cpCol]}>Sjekkpunkter</Text>
            </View>
            {leaderboard.map((entry, i) => (
              <View key={entry.runnerId} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.rankCol]}>{i + 1}</Text>
                <Text style={[styles.tableCell, styles.nameCol]}>{entry.name}</Text>
                <Text style={[styles.tableCell, styles.cpCol]}>
                  {entry.checkpoints}/{totalCheckpoints}
                </Text>
              </View>
            ))}
          </View>
        )}

        {leaderboard.length > 0 && (
          <Button
            title="Last ned rapport"
            variant="outline"
            onPress={handleExport}
            style={{ marginTop: 12 }}
          />
        )}

        {/* Winner drawing */}
        <View style={styles.winnerSection}>
          <Text style={styles.sectionTitle}>Månedlig trekning</Text>
          <Text style={styles.sectionDesc}>
            Trekk en tilfeldig vinner blant deltakere som har besøkt alle sjekkpunkter.
          </Text>

          {winner ? (
            <View style={styles.winnerCard}>
              <Text style={styles.winnerLabel}>Vinner</Text>
              <Text style={styles.winnerName}>{winner.winner_name}</Text>
              <Text style={styles.winnerInfo}>
                {winner.month}/{winner.year}
              </Text>
            </View>
          ) : (
            <Button
              title="Trekk vinner"
              variant="purple"
              onPress={handleDrawWinner}
              loading={drawingWinner}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  back: { color: COLORS.green, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  selectorRow: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text2, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.green },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text2 },
  chipTextActive: { color: COLORS.white },
  table: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.greenLt,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tableCell: { fontSize: 14 },
  rankCol: { width: 30, fontWeight: '700', color: COLORS.text },
  nameCol: { flex: 1, color: COLORS.text },
  cpCol: { width: 100, textAlign: 'right', fontWeight: '600', color: COLORS.green },
  winnerSection: { marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  sectionDesc: { fontSize: 14, color: COLORS.text2, marginBottom: 16, lineHeight: 20 },
  winnerCard: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  winnerLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  winnerName: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  winnerInfo: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
});
