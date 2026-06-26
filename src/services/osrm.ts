import { OSRM_BASE, OSRM_CAR_BASE } from '../constants/config';

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng][]
  distance: number; // meters
  duration: number; // seconds
}

export async function fetchWalkingRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult | null> {
  try {
    const [footResult, carResult] = await Promise.all([
      fetchRoute(OSRM_BASE, 'foot', fromLat, fromLng, toLat, toLng),
      fetchRoute(OSRM_CAR_BASE, 'driving', fromLat, fromLng, toLat, toLng),
    ]);

    if (!footResult && !carResult) return null;
    if (!footResult) return carResult;
    if (!carResult) return footResult;

    return footResult.distance <= carResult.distance ? footResult : carResult;
  } catch {
    return null;
  }
}

async function fetchRoute(
  baseUrl: string,
  profile: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult | null> {
  try {
    const url = `${baseUrl}/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]] // GeoJSON is [lng, lat], we want [lat, lng]
    );

    return {
      coordinates: coords,
      distance: route.distance,
      duration: route.duration,
    };
  } catch {
    return null;
  }
}

export async function snapToRoad(lat: number, lng: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${OSRM_BASE}/nearest/v1/foot/${lng},${lat}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== 'Ok' || !data.waypoints?.[0]) return null;

    const wp = data.waypoints[0].location;
    return { lat: wp[1], lng: wp[0] };
  } catch {
    return null;
  }
}
