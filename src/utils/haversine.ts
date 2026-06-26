const R = 6371000; // Earth radius in meters

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestCheckpoint<T extends { lat: number; lng: number; raceId: string; order: number }>(
  lat: number,
  lng: number,
  checkpoints: T[],
  doneKeys?: Set<string>
): { checkpoint: T; distance: number; index: number } | null {
  let nearest: { checkpoint: T; distance: number; index: number } | null = null;

  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    const key = `${cp.raceId}_${cp.order}`;
    if (doneKeys && doneKeys.has(key)) continue;

    const dist = haversineMeters(lat, lng, cp.lat, cp.lng);
    if (!nearest || dist < nearest.distance) {
      nearest = { checkpoint: cp, distance: dist, index: i };
    }
  }

  return nearest;
}

export function bearingBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
