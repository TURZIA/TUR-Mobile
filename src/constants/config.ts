export const CONFIG = {
  SUPABASE_URL: 'https://lbzvvcggisehfasvxmcm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxienZ2Y2dnaXNlaGZhc3Z4bWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTg2MTgsImV4cCI6MjA5NjgzNDYxOH0.2J6xazbbbKbvMOxPP-ILIcZev-6o17aAYxZH0gONbb4',
  ADMIN_EMAIL: 'ziadnasif77@gmail.com',
  MAX_DISTANCE_METERS: 20,
  PROXIMITY_ALERT_METERS: 50,
  COOLDOWN_MS: 3600000, // 1 hour
  GPS_ACCURACY_THRESHOLD: 50,
  BEST_POS_WINDOW_MS: 10000, // 10 seconds
  TRACK_MAX_POINTS: 800,
  TRACK_MIN_MOVE_METERS: 2,
  OSRM_DEBOUNCE_MS: 200,
  OSRM_MIN_MOVE_METERS: 30,
  ADMIN_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  ADMIN_CODE_LENGTH: 6,
  EMAILJS_SERVICE: 'service_mf2avgt',
  EMAILJS_TEMPLATE: 'template_64ke7fc',
  EMAILJS_PUBLIC_KEY: 'VrIDl9-cEJGl6LTAY',
} as const;

export const OSRM_BASE = 'https://routing.openstreetmap.de/routed-foot';
export const OSRM_CAR_BASE = 'https://routing.openstreetmap.de/routed-car';
export const KARTVERKET_API = 'https://ws.geonorge.no/stedsnavn/v1/navn';
export const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
