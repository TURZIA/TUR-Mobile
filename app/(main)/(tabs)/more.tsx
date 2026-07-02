import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useMapStore } from '@/stores/mapStore';
import { deleteAccount, updateRunnerAdmin } from '@/services/supabase';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadministrator',
  admin: 'Arrangør',
  runner: 'Deltaker',
};

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

export default function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  const isSuperAdmin = user.role === 'superadmin';
  const isAdmin = user.role === 'admin';
  const isRunner = user.role === 'runner';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleCopyCode = async () => {
    if (!user.adminCode) return;
    await Clipboard.setStringAsync(user.adminCode);
    Toast.show({ type: 'success', text1: 'Kode kopiert!' });
  };

  const handleShareCode = async () => {
    if (!user.adminCode) return;
    try {
      await Share.share({ message: `Bli med på TUR! Bruk deltakerkoden: ${user.adminCode}` });
    } catch {}
  };

  const handleChangeAdmin = () => {
    Alert.alert('Bytt arrangør', 'Vil du koble deg fra nåværende arrangør?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Bytt',
        onPress: async () => {
          await updateRunnerAdmin(user.id, null, user.raceId ?? undefined);
          useAuthStore.getState().setUser({ ...user, raceId: null });
          useMapStore.getState().loadCheckpoints();
          router.replace('/(main)/(tabs)/map');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Slett konto',
      'Er du sikker? Kontoen din og alle registreringer slettes permanent. Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett konto',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Toast.show({ type: 'error', text1: 'Kunne ikke slette konto', text2: 'Prøv igjen senere' });
              return;
            }
            useAuthStore.getState().setUser(null);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const adminItems: MenuItem[] = [
    { icon: 'people', label: 'Deltakere', onPress: () => router.push('/(main)/participants') },
    { icon: 'flag', label: 'Sjekkpunkter', onPress: () => router.push('/(main)/checkpoints') },
    { icon: 'add-circle', label: 'Ny tur', onPress: () => router.push('/(main)/new-race') },
  ];

  const superAdminItems: MenuItem[] = [
    { icon: 'speedometer', label: 'Systemstatus', onPress: () => router.push('/(main)/status') },
    { icon: 'shield-checkmark', label: 'Administratorer', onPress: () => router.push('/(main)/admins') },
    { icon: 'flag', label: 'Sjekkpunkter', onPress: () => router.push('/(main)/checkpoints') },
    { icon: 'add-circle', label: 'Ny tur', onPress: () => router.push('/(main)/new-race') },
  ];

  const runnerItems: MenuItem[] = [
    { icon: 'swap-horizontal', label: 'Bytt arrangør', onPress: handleChangeAdmin },
  ];

  const items = isSuperAdmin ? superAdminItems : isAdmin ? adminItems : runnerItems;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABELS[user.role ?? 'runner']}</Text>
        </View>
      </View>

      {/* Admin code card (admins only) */}
      {isAdmin && user.adminCode && (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Din deltakerkode</Text>
          <Text style={styles.codeValue}>{user.adminCode}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeBtn} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={16} color={COLORS.green} />
              <Text style={styles.codeBtnText}>Kopier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeBtn} onPress={handleShareCode}>
              <Ionicons name="share-outline" size={16} color={COLORS.green} />
              <Text style={styles.codeBtnText}>Del</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Menu */}
      <View style={styles.menu}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, i < items.length - 1 && styles.menuItemBorder]}
            onPress={item.onPress}
            activeOpacity={0.6}
          >
            <Ionicons name={item.icon} size={22} color={item.color ?? COLORS.green} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign out / delete */}
      <View style={styles.menu}>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={handleLogout} activeOpacity={0.6}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.text2} />
          <Text style={styles.menuLabel}>Logg ut</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount} activeOpacity={0.6}>
          <Ionicons name="trash-outline" size={22} color={COLORS.red} />
          <Text style={[styles.menuLabel, { color: COLORS.red }]}>Slett konto</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>TUR v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: COLORS.white },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  email: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  roleBadge: {
    marginTop: 10,
    backgroundColor: COLORS.greenLt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: COLORS.green },
  codeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  codeLabel: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  codeValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 6,
    marginVertical: 8,
  },
  codeActions: { flexDirection: 'row', gap: 12 },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.greenLt,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  codeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.green },
  menu: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  version: { textAlign: 'center', color: COLORS.muted, fontSize: 12, marginTop: 8 },
});
