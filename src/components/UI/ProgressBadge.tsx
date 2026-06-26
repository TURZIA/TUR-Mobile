import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';
import { useMapStore } from '../../stores/mapStore';

export function ProgressBadge() {
  const { checkpoints, doneCheckpoints } = useMapStore();

  const total = checkpoints.length;
  const done = Array.from(doneCheckpoints).length;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        {done}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 42,
    alignItems: 'center',
  },
  text: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
