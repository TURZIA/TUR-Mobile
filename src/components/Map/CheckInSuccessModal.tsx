import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';
import { Button } from '../UI/Button';
import { useMapStore } from '../../stores/mapStore';
import { formatElapsed } from '../../utils/formatters';

export function CheckInSuccessModal() {
  const celebration = useMapStore((s) => s.celebration);
  const setCelebration = useMapStore((s) => s.setCelebration);
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (celebration) {
      scaleAnim.setValue(0.6);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [celebration]);

  if (!celebration) return null;

  const allDone = celebration.total > 0 && celebration.done >= celebration.total;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          <View style={[styles.iconCircle, allDone && styles.iconCircleGold]}>
            <Ionicons name={allDone ? 'trophy' : 'checkmark'} size={44} color={COLORS.white} />
          </View>

          <Text style={styles.title}>{allDone ? 'Gratulerer!' : 'Registrert!'}</Text>
          <Text style={styles.place}>{celebration.name}</Text>

          {allDone && (
            <Text style={styles.allDoneText}>Du har besøkt alle steder! 🎉</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {celebration.done}/{celebration.total}
              </Text>
              <Text style={styles.statLabel}>Fremgang</Text>
            </View>
            {celebration.elapsed != null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatElapsed(celebration.elapsed)}</Text>
                <Text style={styles.statLabel}>Siden forrige</Text>
              </View>
            )}
          </View>

          <Button title="Fortsett" onPress={() => setCelebration(null)} style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...SHADOWS.lg,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleGold: {
    backgroundColor: '#D4A017',
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  place: { fontSize: 16, fontWeight: '600', color: COLORS.text2, marginTop: 4, textAlign: 'center' },
  allDoneText: { fontSize: 15, color: COLORS.green, fontWeight: '700', marginTop: 8 },
  statsRow: {
    flexDirection: 'row',
    gap: 28,
    marginVertical: 20,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.green },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '600' },
});
