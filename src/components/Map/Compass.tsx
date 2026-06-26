import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { COLORS } from '../../constants/theme';
import { useMapStore } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { bearingBetween } from '../../utils/haversine';

export function Compass() {
  const user = useAuthStore((s) => s.user);
  const { smoothedPosition, nearestCheckpoint } = useMapStore();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [heading, setHeading] = useState(0);

  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    if (isSuperAdmin) return;

    const subscription = Magnetometer.addListener((data) => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading((angle + 360) % 360);
    });

    Magnetometer.setUpdateInterval(100);

    return () => subscription.remove();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!smoothedPosition || !nearestCheckpoint || isSuperAdmin) return;

    const bearing = bearingBetween(
      smoothedPosition.lat,
      smoothedPosition.lng,
      nearestCheckpoint.checkpoint.lat,
      nearestCheckpoint.checkpoint.lng
    );

    const rotation = bearing - heading;
    Animated.timing(rotateAnim, {
      toValue: rotation,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [heading, smoothedPosition, nearestCheckpoint]);

  if (isSuperAdmin || !nearestCheckpoint || !smoothedPosition) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.arrow, { transform: [{ rotate: spin }] }]}>
        <View style={styles.arrowHead} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  arrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.redArrow,
  },
});
