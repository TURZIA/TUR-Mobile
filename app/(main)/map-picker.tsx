import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNMapView, { Marker, MapPressEvent } from 'react-native-maps';
import { router } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { searchPlaces, type SearchResult } from '@/services/search';

export default function MapPickerScreen() {
  const mapRef = useRef<RNMapView>(null);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [placeName, setPlaceName] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ lat: latitude, lng: longitude });
    setPlaceName('');
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await searchPlaces(query);
      setResults(res);
    }, 400);
  }, []);

  const selectResult = (result: SearchResult) => {
    setMarker({ lat: result.lat, lng: result.lng });
    setPlaceName(result.name);
    setResults([]);
    setSearchQuery(result.name);
    mapRef.current?.animateToRegion(
      {
        latitude: result.lat,
        longitude: result.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };

  const handleConfirm = () => {
    if (!marker) return;
    router.navigate({
      pathname: '/(main)/new-race',
      params: {
        lat: marker.lat.toString(),
        lng: marker.lng.toString(),
        placeName: placeName || '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Søk etter sted..."
          placeholderTextColor={COLORS.muted}
        />
      </View>

      {/* Search results */}
      {results.length > 0 && (
        <View style={styles.resultsList}>
          <FlatList
            data={results}
            keyExtractor={(_, i) => i.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => selectResult(item)}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultInfo}>
                  {item.type} · {item.municipality}
                  {item.county ? ` · ${item.county}` : ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Map */}
      <RNMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 59.9139,
          longitude: 10.7522,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }}
        onPress={handleMapPress}
      >
        {marker && (
          <Marker
            coordinate={{ latitude: marker.lat, longitude: marker.lng }}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setMarker({ lat: latitude, lng: longitude });
            }}
          />
        )}
      </RNMapView>

      {/* Coordinate display */}
      {marker && (
        <View style={styles.coordPill}>
          <Text style={styles.coordText}>
            {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>✕ Avbryt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, !marker && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={!marker}
        >
          <Text style={styles.confirmText}>✓ Bekreft</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    ...SHADOWS.md,
  },
  resultsList: {
    position: 'absolute',
    top: 115,
    left: 16,
    right: 16,
    maxHeight: 250,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    zIndex: 10,
    ...SHADOWS.md,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  resultInfo: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  map: { flex: 1 },
  coordPill: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  coordText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  actions: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: COLORS.red },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
