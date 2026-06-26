import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { Button } from '@/components/UI/Button';
import { useAuthStore } from '@/stores/authStore';
import { useMapStore } from '@/stores/mapStore';
import {
  getActiveRaces,
  getCheckpointsByRaceIds,
  deleteCheckpointsByRace,
  deactivateRace,
  type Race,
  type Checkpoint,
} from '@/services/supabase';

interface RaceWithCheckpoints {
  race: Race;
  checkpoints: Checkpoint[];
}

export default function CheckpointsScreen() {
  const user = useAuthStore((s) => s.user);
  const [racesData, setRacesData] = useState<RaceWithCheckpoints[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: races } = await getActiveRaces();
      if (!races?.length) {
        setRacesData([]);
        return;
      }

      const raceIds = races.map((r) => r.race_id);
      const { data: cps } = await getCheckpointsByRaceIds(raceIds);

      const grouped: RaceWithCheckpoints[] = races.map((race) => ({
        race,
        checkpoints: (cps || []).filter((cp) => cp.race_id === race.race_id),
      }));

      setRacesData(grouped);
    } catch {
      Toast.show({ type: 'error', text1: 'Feil ved lasting' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRace = (race: Race) => {
    const canDelete = isSuperAdmin || race.admin_code === user?.adminCode;
    if (!canDelete) {
      Toast.show({ type: 'error', text1: 'Du kan ikke slette denne turen' });
      return;
    }

    Alert.alert(
      'Slett tur',
      `Er du sikker på at du vil slette "${race.name}"? Alle sjekkpunkter fjernes.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCheckpointsByRace(race.race_id);
              await deactivateRace(race.race_id);
              Toast.show({ type: 'success', text1: 'Tur slettet' });
              loadData();
              useMapStore.getState().loadCheckpoints();
            } catch {
              Toast.show({ type: 'error', text1: 'Kunne ikke slette tur' });
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Tilbake</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sjekkpunkter</Text>
        <TouchableOpacity onPress={() => router.push('/(main)/new-race')}>
          <Text style={styles.addBtn}>+ Ny tur</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {racesData.length === 0 ? (
            <Text style={styles.empty}>Ingen aktive turer.</Text>
          ) : (
            racesData.map(({ race, checkpoints }) => (
              <View key={race.race_id} style={styles.raceCard}>
                <View style={styles.raceHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.raceName}>{race.name}</Text>
                    {isSuperAdmin && (
                      <Text style={styles.raceAdmin}>{race.admin_code}</Text>
                    )}
                  </View>
                  {(isSuperAdmin || race.admin_code === user?.adminCode) && (
                    <TouchableOpacity onPress={() => handleDeleteRace(race)}>
                      <Text style={styles.deleteBtn}>Slett</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {checkpoints.map((cp) => (
                  <View key={cp.id} style={styles.cpItem}>
                    <Text style={styles.cpOrder}>{cp.cp_order}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cpName}>{cp.name}</Text>
                      <Text style={styles.cpCoords}>
                        {cp.lat.toFixed(6)}, {cp.lng.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                ))}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  back: { color: COLORS.green, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  addBtn: { color: COLORS.green, fontSize: 15, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  empty: { textAlign: 'center', color: COLORS.muted, fontSize: 15, marginTop: 40 },
  raceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.greenLt,
  },
  raceName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  raceAdmin: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  deleteBtn: { color: COLORS.red, fontSize: 14, fontWeight: '600' },
  cpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cpOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
  },
  cpName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cpCoords: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
