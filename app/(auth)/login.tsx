import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { signIn, signUp, resetPassword, getAdminByEmail, getAdminByCode, upsertRunner } from '@/services/supabase';
import { useAuthStore, savePendingSignup, clearPendingSignup } from '@/stores/authStore';

type FormMode = 'login' | 'signup' | 'reset';

export default function LoginScreen() {
  const [mode, setMode] = useState<FormMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const resolveUser = useAuthStore((s) => s.resolveUser);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Fyll inn e-post og passord' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await signIn(email.trim(), password);
      if (error) {
        Toast.show({ type: 'error', text1: 'Innlogging feilet', text2: error.message });
        return;
      }
      if (data.user) {
        await resolveUser(
          data.user.id,
          data.user.email ?? '',
          data.user.user_metadata?.full_name ?? data.user.email ?? ''
        );
        router.replace('/(main)/map');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Feil', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Toast.show({ type: 'error', text1: 'Navn må ha minst 2 tegn' });
      return;
    }
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'E-post er påkrevd' });
      return;
    }
    if (!password || password.length < 6) {
      Toast.show({ type: 'error', text1: 'Passord må ha minst 6 tegn' });
      return;
    }

    if (showAdminCode && adminCode.trim()) {
      const { data: admin } = await getAdminByCode(adminCode.trim().toUpperCase());
      if (!admin) {
        Toast.show({ type: 'error', text1: 'Ugyldig deltakerkode' });
        return;
      }
    }

    setLoading(true);
    try {
      const pendingCode = showAdminCode && adminCode.trim() ? adminCode.trim().toUpperCase() : null;
      await savePendingSignup(name.trim(), pendingCode);

      const { data, error } = await signUp(email.trim(), password, name.trim());
      if (error) {
        Toast.show({ type: 'error', text1: 'Registrering feilet', text2: error.message });
        return;
      }

      if (data.user && !data.session) {
        Toast.show({ type: 'success', text1: 'Sjekk e-posten din for å bekrefte kontoen' });
        setMode('login');
        return;
      }

      if (data.user && data.session) {
        await clearPendingSignup();
        await upsertRunner({
          id: data.user.id,
          name: name.trim(),
          email: email.trim(),
          race_id: pendingCode,
        });
        await resolveUser(data.user.id, email.trim(), name.trim());
        router.replace('/(main)/map');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Feil', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Skriv inn e-post' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        setResetMessage('Kunne ikke sende tilbakestillingslenke');
      } else {
        setResetMessage('Sjekk e-posten din for tilbakestillingslenke');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkAdminEmail = async () => {
    if (!email.trim()) return;
    try {
      const { data: admin } = await getAdminByEmail(email.trim());
      if (admin) setShowAdminCode(false);
      else setShowAdminCode(true);
    } catch {
      setShowAdminCode(true);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.green, COLORS.greenDk, COLORS.bg]}
        locations={[0, 0.35, 0.65]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.logo}>TUR</Text>

          <View style={styles.card}>
            {mode === 'login' && (
              <>
                <Text style={styles.title}>Logg inn</Text>
                <Input
                  label="E-post"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="din@epost.no"
                />
                <Input
                  label="Passord"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••"
                  onSubmitEditing={handleLogin}
                />
                <Button title="Logg inn" onPress={handleLogin} loading={loading} />
                <View style={styles.links}>
                  <TouchableOpacity onPress={() => setMode('signup')}>
                    <Text style={styles.link}>Registrer deg her</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setMode('reset'); setResetMessage(''); }}>
                    <Text style={styles.linkMuted}>Glemt passord?</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {mode === 'signup' && (
              <>
                <Text style={styles.title}>Opprett konto</Text>
                <Input
                  label="Ditt navn"
                  value={name}
                  onChangeText={setName}
                  placeholder="Ola Nordmann"
                />
                <Input
                  label="E-post"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="din@epost.no"
                  onBlur={checkAdminEmail}
                />
                <Input
                  label="Passord"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Minst 6 tegn"
                />
                {showAdminCode && (
                  <Input
                    label="Deltakerkode"
                    value={adminCode}
                    onChangeText={(v) => setAdminCode(v.toUpperCase())}
                    placeholder="Fra arrangøren"
                    maxLength={6}
                    autoCapitalize="characters"
                  />
                )}
                <Button title="Opprett konto" onPress={handleSignup} loading={loading} />
                <View style={styles.links}>
                  <TouchableOpacity onPress={() => setMode('login')}>
                    <Text style={styles.link}>Logg inn her</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {mode === 'reset' && (
              <>
                <Text style={styles.title}>Tilbakestill passord</Text>
                <Input
                  label="E-post"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="din@epost.no"
                />
                {resetMessage !== '' && (
                  <Text
                    style={[
                      styles.resetMsg,
                      { color: resetMessage.includes('Sjekk') ? COLORS.green : COLORS.red },
                    ]}
                  >
                    {resetMessage}
                  </Text>
                )}
                <Button
                  title="Send tilbakestillingslenke"
                  onPress={handleReset}
                  loading={loading}
                />
                <View style={styles.links}>
                  <TouchableOpacity onPress={() => setMode('login')}>
                    <Text style={styles.link}>← Tilbake til innlogging</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 24,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  links: {
    marginTop: 16,
    alignItems: 'center',
    gap: 10,
  },
  link: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '600',
  },
  linkMuted: {
    color: COLORS.muted,
    fontSize: 13,
  },
  resetMsg: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
});
