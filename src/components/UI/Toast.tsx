import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

export const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={[styles.container, styles.success]}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.subtitle}>{text2}</Text> : null}
    </View>
  ),
  error: ({ text1, text2 }: any) => (
    <View style={[styles.container, styles.error]}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.subtitle}>{text2}</Text> : null}
    </View>
  ),
  warning: ({ text1, text2 }: any) => (
    <View style={[styles.container, styles.warning]}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.subtitle}>{text2}</Text> : null}
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    marginHorizontal: 16,
    minWidth: '85%',
    ...SHADOWS.md,
  },
  success: {
    backgroundColor: COLORS.green,
  },
  error: {
    backgroundColor: COLORS.red,
  },
  warning: {
    backgroundColor: COLORS.amber,
  },
  title: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
  },
});
