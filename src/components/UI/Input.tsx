import React from 'react';
import { TextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={COLORS.muted}
        autoCapitalize="none"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text2,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputError: {
    borderColor: COLORS.red,
  },
  error: {
    fontSize: 13,
    color: COLORS.red,
    marginTop: 4,
  },
});
