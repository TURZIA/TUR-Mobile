import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { getSystemCounts } from '@/services/supabase';

export default function StatusScreen() {
  const [counts, setCounts] = useState({ checkpoints: 0, admins: 0, runners: 0, races: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    setLoading(true);
    try {
      const data = await getSystemCounts();
      setCounts(data);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: 'Sjekkpunkter', value: counts.checkpoints, color: COLORS.green },
    { label: 'Admins', value: counts.admins, color: COLORS.blue },
    { label: 'Deltakere', value: counts.runners, color: COLORS.purple },
    { label: 'Løp / aktive', value: counts.races, color: COLORS.amber },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Status</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {cards.map((card) => (
            <View key={card.label} style={[styles.card, { borderLeftColor: card.color }]}>
              <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
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
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  close: { fontSize: 22, color: COLORS.muted, padding: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 20,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  cardValue: { fontSize: 36, fontWeight: '800' },
  cardLabel: { fontSize: 14, color: COLORS.muted, marginTop: 4, fontWeight: '500' },
});
