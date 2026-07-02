import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import RNMapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { COLORS } from '../../constants/theme';
import { useMapStore, type MapCheckpoint } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';

const NORWAY_REGION = {
  latitude: 59.9139,
  longitude: 10.7522,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function MapViewComponent() {
  const mapRef = useRef<RNMapView>(null);
  const {
    checkpoints,
    doneCheckpoints,
    smoothedPosition,
    currentPosition,
    routeCoords,
    nearestCheckpoint,
  } = useMapStore();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'superadmin';

  const isDone = useCallback(
    (cp: MapCheckpoint) => doneCheckpoints.has(`${cp.raceId}_${cp.order}`),
    [doneCheckpoints]
  );

  useEffect(() => {
    if (smoothedPosition && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: smoothedPosition.lat,
          longitude: smoothedPosition.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500
      );
    }
  }, [smoothedPosition?.lat != null]);

  return (
    <View style={styles.container}>
      <RNMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={NORWAY_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={false}
        mapType="standard"
      >
        {/* Checkpoint markers */}
        {checkpoints.map((cp) => {
          const done = isDone(cp);
          return (
            <React.Fragment key={`${cp.raceId}_${cp.order}`}>
              <Circle
                center={{ latitude: cp.lat, longitude: cp.lng }}
                radius={8}
                fillColor={done ? COLORS.red : COLORS.green}
                strokeColor={done ? '#DC2626' : '#059669'}
                strokeWidth={2}
              />
              {/* Pulsing ring for nearest */}
              {nearestCheckpoint?.checkpoint === cp && !done && (
                <Circle
                  center={{ latitude: cp.lat, longitude: cp.lng }}
                  radius={20}
                  fillColor="rgba(14,163,113,0.15)"
                  strokeColor="rgba(14,163,113,0.4)"
                  strokeWidth={1}
                />
              )}
              <Marker
                coordinate={{ latitude: cp.lat, longitude: cp.lng }}
                title={cp.name}
                description={done ? 'Besøkt' : 'Ikke besøkt'}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View style={[styles.markerDot, { backgroundColor: done ? COLORS.red : COLORS.green }]} />
              </Marker>
            </React.Fragment>
          );
        })}

        {/* User position (blue dot) */}
        {smoothedPosition && (
          <>
            <Circle
              center={{
                latitude: smoothedPosition.lat,
                longitude: smoothedPosition.lng,
              }}
              radius={currentPosition?.accuracy ?? 10}
              fillColor="rgba(59,130,246,0.1)"
              strokeColor="rgba(59,130,246,0.3)"
              strokeWidth={1}
            />
            <Marker
              coordinate={{
                latitude: smoothedPosition.lat,
                longitude: smoothedPosition.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.blueDotOuter}>
                <View style={styles.blueDotInner} />
              </View>
            </Marker>
          </>
        )}

        {/* Route line to nearest checkpoint */}
        {!isSuperAdmin && routeCoords && routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords.map(([lat, lng]) => ({
              latitude: lat,
              longitude: lng,
            }))}
            strokeColor={COLORS.redArrow}
            strokeWidth={3}
            lineDashPattern={[10, 6]}
          />
        )}
      </RNMapView>

      {/* Map Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
          <Text style={styles.legendText}>Sted</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
          <Text style={styles.legendText}>Besøkt</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.blue }]} />
          <Text style={styles.legendText}>Din posisjon</Text>
        </View>
        {!isSuperAdmin && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: COLORS.redArrow }]} />
            <Text style={styles.legendText}>Neste sted</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  blueDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59,130,246,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.blue,
    borderWidth: 2.5,
    borderColor: COLORS.white,
  },
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    padding: 10,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 1.5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.text2,
    fontWeight: '500',
  },
});
