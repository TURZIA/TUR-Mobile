import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { useAuthStore } from '@/stores/authStore';
import { useMapStore } from '@/stores/mapStore';
import { createRace, createCheckpoint } from '@/services/supabase';
import { CONFIG } from '@/constants/config';
import { genAdminCode } from '@/utils/formatters';
import { consumePickedLocation } from '@/utils/pickerResult';

export default function NewRaceScreen() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'superadmin';

  const [raceName, setRaceName] = useState('');
  const [adminCodeInput, setAdminCodeInput] = useState(user?.adminCode || '');
  const [selectedLat, setSelectedLat] = useState(0);
  const [selectedLng, setSelectedLng] = useState(0);
  const [placeName, setPlaceName] = useState('');
  const [loading, setLoading] = useState(false);

  // Pick up the location chosen in map-picker when this screen regains focus
  useFocusEffect(
    useCallback(() => {
      const picked = consumePickedLocation();
      if (picked) {
        setSelectedLat(picked.lat);
        setSelectedLng(picked.lng);
        if (picked.placeName) setPlaceName(picked.placeName);
      }
    }, [])
  );

  const hasLocation = selectedLat !== 0 && selectedLng !== 0;

  const handleCreate = async () => {
    if (!raceName.trim()) {
      Toast.show({ type: 'error', text1: 'Skriv inn turnavn' });
      return;
    }
    if (!hasLocation) {
      Toast.show({ type: 'error', text1: 'Velg et sted på kartet' });
      return;
    }

    const code = isSuperAdmin ? adminCodeInput.trim() : user?.adminCode;
    if (!code) {
      Toast.show({ type: 'error', text1: 'Arrangørkode mangler' });
      return;
    }

    setLoading(true);
    try {
      const raceId = `${code}_${genAdminCode().slice(0, 4)}`;
      const cpName = placeName || raceName.trim();

      await createRace(code, raceId, raceName.trim());
      await createCheckpoint({
        race_id: raceId,
        cp_order: 1,
        name: cpName,
        lat: selectedLat,
        lng: selectedLng,
      });

      Toast.show({ type: 'success', text1: 'Tur opprettet!' });
      useMapStore.getState().loadCheckpoints();
      router.back();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Kunne ikke opprette tur' });
    } finally {
      setLoading(false);
    }
  };

  const openMapPicker = () => {
    router.push('/(main)/map-picker');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Tilbake</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ny tur</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Input
          label="Turnavn"
          value={raceName}
          onChangeText={setRaceName}
          placeholder="F.eks. Søndagstur i marka"
        />

        {isSuperAdmin && (
          <Input
            label="Arrangørkode"
            value={adminCodeInput}
            onChangeText={(v) => setAdminCodeInput(v.toUpperCase())}
            placeholder="Admin-kode"
            maxLength={6}
            autoCapitalize="characters"
          />
        )}

        <Button
          title="Velg sted på kartet"
          variant="outline"
          onPress={openMapPicker}
          style={{ marginBottom: 16 }}
        />

        {hasLocation && (
          <View style={styles.locationCard}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationName}>{placeName || 'Valgt sted'}</Text>
              <Text style={styles.locationCoords}>
                {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </Text>
            </View>
          </View>
        )}

        <Button
          title="+ Opprett tur"
          onPress={handleCreate}
          loading={loading}
          disabled={!raceName.trim() || !hasLocation}
          style={{ marginTop: 24 }}
        />
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
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLt,
    borderRadius: RADIUS.sm,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  locationIcon: { fontSize: 20 },
  locationName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  locationCoords: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
