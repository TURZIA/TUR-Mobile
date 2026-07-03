import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '@/constants/theme';
import { Button } from '@/components/UI/Button';

export const ONBOARDING_KEY = 'tur_onboarded_v1';

const { width } = Dimensions.get('window');

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'map',
    title: 'Velkommen til TUR',
    text: 'Utforsk tursteder i nærheten, følg kartet og la kompasset vise vei til neste sted.',
  },
  {
    icon: 'checkmark-circle',
    title: 'Registrer besøk',
    text: 'Gå til et tursted og registrer posisjonen din når du er innen 20 meter. GPS bekrefter at du faktisk var der!',
  },
  {
    icon: 'trophy',
    title: 'Vinn premier',
    text: 'Besøk alle steder i løpet av måneden og bli med i trekningen av månedens premie.',
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = index === SLIDES.length - 1;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
    }
  ).current;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(auth)/login');
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.green, COLORS.greenDk]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.title}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={64} color={COLORS.white} />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.text}>{item.text}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            title={isLast ? 'Kom i gang' : 'Neste'}
            onPress={next}
            style={styles.nextBtn}
            textStyle={{ color: COLORS.green }}
          />
          {!isLast && (
            <Text style={styles.skip} onPress={finish}>
              Hopp over
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 14,
  },
  text: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 22,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  nextBtn: {
    backgroundColor: COLORS.white,
    alignSelf: 'stretch',
    borderRadius: RADIUS.sm,
  },
  skip: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    padding: 6,
  },
});
