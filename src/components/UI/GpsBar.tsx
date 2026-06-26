import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useMapStore } from '../../stores/mapStore';

export function GpsBar() {
  const { gpsStatus, gpsAccuracy } = useMapStore();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (gpsStatus === 'weak') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [gpsStatus]);

  const getConfig = () => {
    switch (gpsStatus) {
      case 'good':
        return {
          bg: COLORS.gpsGreen,
          text: `GPS OK ±${Math.round(gpsAccuracy)}m`,
          dotColor: '#22C55E',
        };
      case 'weak':
        return {
          bg: COLORS.gpsYellow,
          text: `GPS svak ±${Math.round(gpsAccuracy)}m`,
          dotColor: '#FBBF24',
        };
      case 'denied':
        return {
          bg: COLORS.gpsRed,
          text: 'GPS nektet',
          dotColor: COLORS.red,
        };
      default:
        return {
          bg: '#9CA3AF',
          text: 'Henter posisjon…',
          dotColor: '#9CA3AF',
        };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Animated.View
        style={[styles.dot, { backgroundColor: config.dotColor, opacity: pulseAnim }]}
      />
      <Text style={styles.text}>{config.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
