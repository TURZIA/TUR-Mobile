export const COLORS = {
  green: '#0EA371',
  greenDk: '#0B7D57',
  greenLt: '#E6F9F3',
  red: '#EF4444',
  amber: '#C9A800',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#0D1117',
  text2: '#374151',
  muted: '#6B7280',
  purple: '#6D28D9',
  purpleLt: '#8B5CF6',
  blue: '#3B82F6',
  redArrow: '#FF6B6B',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  gpsGreen: '#16A34A',
  gpsYellow: '#EAB308',
  gpsRed: '#EF4444',
} as const;

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
