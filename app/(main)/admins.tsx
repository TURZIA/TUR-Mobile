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
import { Input } from '@/components/UI/Input';
import {
  getAllAdmins,
  addAdmin,
  deactivateAdmin,
  supabase,
  type Admin,
} from '@/services/supabase';
import { genAdminCode } from '@/utils/formatters';

export default function AdminsScreen() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data } = await getAllAdmins();
      setAdmins(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setAdding(true);
    setResult(null);

    try {
      // Check if already exists (possibly deactivated)
      const { data: existing } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (existing && existing.is_active) {
        setResult({ type: 'error', text: 'Admin finnes allerede' });
        return;
      }

      if (existing && !existing.is_active) {
        // Reactivate
        await supabase.from('admins').update({ is_active: true }).eq('id', existing.id);
        setResult({ type: 'success', text: `Reaktivert med kode: ${existing.admin_code}` });
        setNewEmail('');
        loadAdmins();
        return;
      }

      const code = genAdminCode();
      const { error } = await addAdmin(email, code);
      if (error) {
        setResult({ type: 'error', text: 'Kunne ikke legge til admin' });
        return;
      }

      setResult({ type: 'success', text: `Admin opprettet med kode: ${code}` });
      setNewEmail('');
      loadAdmins();
    } catch {
      setResult({ type: 'error', text: 'Noe gikk galt' });
    } finally {
      setAdding(false);
    }
  };

  const handleDeactivate = (admin: Admin) => {
    Alert.alert(
      'Deaktiver admin',
      `Deaktivere ${admin.email}?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Deaktiver',
          style: 'destructive',
          onPress: async () => {
            await deactivateAdmin(admin.id);
            Toast.show({ type: 'success', text1: 'Admin deaktivert' });
            loadAdmins();
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
        <Text style={styles.title}>Admins</Text>
        <View style={{ width: 70 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Admin list */}
          {admins.map((admin) => (
            <View key={admin.id} style={styles.adminItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminCode}>{admin.admin_code}</Text>
                <Text style={styles.adminEmail}>{admin.email}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeactivate(admin)}>
                <Text style={styles.deactivateBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add admin form */}
          <View style={styles.addSection}>
            <Text style={styles.sectionTitle}>Legg til ny admin</Text>
            <Input
              label="E-post"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              placeholder="admin@epost.no"
            />
            {result && (
              <Text
                style={[styles.result, { color: result.type === 'success' ? COLORS.green : COLORS.red }]}
              >
                {result.text}
              </Text>
            )}
            <Button
              title="Legg til admin"
              onPress={handleAddAdmin}
              loading={adding}
              disabled={!newEmail.trim()}
            />
          </View>
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
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  adminCode: { fontSize: 16, fontWeight: '800', color: COLORS.green, letterSpacing: 2 },
  adminEmail: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  deactivateBtn: { fontSize: 20, color: COLORS.red, padding: 4 },
  addSection: {
    marginTop: 32,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 20,
    ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  result: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
});
