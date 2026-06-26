import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { useAuthStore } from '@/stores/authStore';
import {
  getRunnersByAdmin,
  updateRunnerAdmin,
  supabase,
  type Runner,
} from '@/services/supabase';

export default function ParticipantsScreen() {
  const user = useAuthStore((s) => s.user);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const adminCode = user?.adminCode;

  useEffect(() => {
    loadRunners();
  }, []);

  const loadRunners = async () => {
    if (!adminCode) return;
    setLoading(true);
    try {
      const { data } = await getRunnersByAdmin(adminCode);
      setRunners(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!adminCode) return;
    try {
      await Share.share({
        message: `Bli med på TUR! Bruk deltakerkoden: ${adminCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleCopyCode = async () => {
    if (!adminCode) return;
    await Clipboard.setStringAsync(adminCode);
    Toast.show({ type: 'success', text1: 'Kode kopiert!' });
  };

  const handleAddRunner = async () => {
    const email = addEmail.trim().toLowerCase();
    if (!email || !adminCode) return;

    if (email === user?.email) {
      Toast.show({ type: 'error', text1: 'Du kan ikke legge til deg selv' });
      return;
    }

    setAdding(true);
    try {
      const { data: runner } = await supabase
        .from('runners')
        .select('*')
        .eq('email', email)
        .single();

      if (!runner) {
        Toast.show({ type: 'error', text1: 'Ingen bruker med denne e-posten' });
        return;
      }

      if (runner.race_id === adminCode) {
        Toast.show({ type: 'warning', text1: 'Allerede koblet til deg' });
        return;
      }

      await updateRunnerAdmin(runner.id, adminCode);
      Toast.show({ type: 'success', text1: `${runner.name} lagt til!` });
      setAddEmail('');
      loadRunners();
    } catch {
      Toast.show({ type: 'error', text1: 'Kunne ikke legge til deltaker' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRunner = (runner: Runner) => {
    Alert.alert(
      'Fjern deltaker',
      `Fjerne ${runner.name} fra dine deltakere?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Fjern',
          style: 'destructive',
          onPress: async () => {
            await updateRunnerAdmin(runner.id, null, adminCode ?? undefined);
            Toast.show({ type: 'success', text1: `${runner.name} fjernet` });
            loadRunners();
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
        <Text style={styles.title}>Deltakere</Text>
        <View style={{ width: 70 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.count}>{runners.length} deltakere</Text>

          {/* Share section */}
          <TouchableOpacity style={styles.shareToggle} onPress={() => setShowShare(!showShare)}>
            <Text style={styles.shareToggleText}>Del kode</Text>
          </TouchableOpacity>

          {showShare && adminCode && (
            <View style={styles.shareCard}>
              <Text style={styles.codeDisplay}>{adminCode}</Text>
              <View style={styles.shareButtons}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleCopyCode}>
                  <Text style={styles.shareBtnText}>Kopier kode</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                  <Text style={styles.shareBtnText}>Del invitasjon</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Add by email */}
          <View style={styles.addSection}>
            <Input
              label="Legg til deltaker med e-post"
              value={addEmail}
              onChangeText={setAddEmail}
              keyboardType="email-address"
              placeholder="deltaker@epost.no"
            />
            <Button
              title="+ Legg til"
              onPress={handleAddRunner}
              loading={adding}
              disabled={!addEmail.trim()}
            />
          </View>

          {/* Runner list */}
          {runners.length === 0 ? (
            <Text style={styles.empty}>Ingen deltakere koblet til deg ennå.</Text>
          ) : (
            runners.map((runner) => (
              <View key={runner.id} style={styles.runnerItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runnerName}>{runner.name}</Text>
                  <Text style={styles.runnerEmail}>{runner.email}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveRunner(runner)}>
                  <Text style={styles.removeBtn}>Fjern</Text>
                </TouchableOpacity>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  count: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  shareToggle: {
    backgroundColor: COLORS.greenLt,
    borderRadius: RADIUS.sm,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareToggleText: { color: COLORS.green, fontSize: 15, fontWeight: '700' },
  shareCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  codeDisplay: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 6,
    marginBottom: 16,
  },
  shareButtons: { flexDirection: 'row', gap: 12 },
  shareBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shareBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  addSection: { marginBottom: 24 },
  empty: { textAlign: 'center', color: COLORS.muted, fontSize: 15, marginTop: 24 },
  runnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  runnerName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  runnerEmail: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  removeBtn: { color: COLORS.red, fontSize: 14, fontWeight: '600' },
});
