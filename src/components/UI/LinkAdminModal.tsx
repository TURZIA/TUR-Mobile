import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';
import { Button } from './Button';
import { Input } from './Input';
import { getAdminByCode, updateRunnerAdmin } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import Toast from 'react-native-toast-message';

interface Props {
  visible: boolean;
  onLinked: () => void;
}

export function LinkAdminModal({ visible, onLinked }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);

  const handleLink = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Koden må være 6 tegn');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: admin } = await getAdminByCode(trimmed);
      if (!admin) {
        setError('Ugyldig deltakerkode');
        setLoading(false);
        return;
      }

      if (user) {
        await updateRunnerAdmin(user.id, trimmed);
        useAuthStore.getState().setUser({
          ...user,
          raceId: trimmed,
        });
        Toast.show({ type: 'success', text1: 'Koblet til arrangør!' });
        onLinked();
      }
    } catch {
      setError('Noe gikk galt. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Koble til arrangør</Text>
          <Text style={styles.desc}>
            Skriv inn deltakerkoden du fikk fra arrangøren for å bli koblet til en tur.
          </Text>
          <Input
            label="Deltakerkode"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder="F.eks. ABC123"
            maxLength={6}
            autoCapitalize="characters"
            error={error}
          />
          <Button title="Koble til" onPress={handleLink} loading={loading} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: COLORS.text2,
    marginBottom: 20,
    lineHeight: 20,
  },
});
