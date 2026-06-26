import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'green' | 'gray' | 'blue' | 'red' | 'purple' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'green',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.green : COLORS.white} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              variant === 'outline' && styles.outlineText,
              variant === 'red' && styles.redText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  green: {
    backgroundColor: COLORS.green,
  },
  gray: {
    backgroundColor: '#E5E7EB',
  },
  blue: {
    backgroundColor: COLORS.blue,
  },
  red: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  purple: {
    backgroundColor: COLORS.purple,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.green,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  outlineText: {
    color: COLORS.green,
  },
  redText: {
    color: COLORS.red,
  },
});
