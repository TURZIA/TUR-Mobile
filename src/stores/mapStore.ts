import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';
import {
  getActiveRaces,
  getCheckpointsByRaceIds,
  getCheckInsByRunner,
  type Checkpoint,
  type CheckIn,
  type Race,
} from '../services/supabase';
import { doneKey } from '../utils/formatters';
import type { Position } from '../services/location';

export interface MapCheckpoint extends Checkpoint {
  raceId: string;
  order: number;
  snapLat?: number;
  snapLng?: number;
}

interface MapState {
  checkpoints: MapCheckpoint[];
  races: Race[];
  doneCheckpoints: Set<string>;
  allCheckIns: CheckIn[];
  currentPosition: Position | null;
  smoothedPosition: { lat: number; lng: number } | null;
  gpsAccuracy: number;
  gpsStatus: 'good' | 'weak' | 'denied' | 'loading';
  routeCoords: [number, number][] | null;
  nearestCheckpoint: { checkpoint: MapCheckpoint; distance: number } | null;
  isRegistering: boolean;
  cooldowns: Record<string, number>;

  loadCheckpoints: () => Promise<void>;
  loadHistory: (runnerId: string) => Promise<void>;
  setPosition: (pos: Position) => void;
  setSmoothedPosition: (pos: { lat: number; lng: number }) => void;
  setGpsStatus: (status: 'good' | 'weak' | 'denied' | 'loading') => void;
  setRouteCoords: (coords: [number, number][] | null) => void;
  setNearestCheckpoint: (cp: { checkpoint: MapCheckpoint; distance: number } | null) => void;
  markDone: (raceId: string, order: number) => void;
  isDone: (raceId: string, order: number) => boolean;
  setIsRegistering: (val: boolean) => void;
  setCooldown: (key: string) => void;
  isCoolingDown: (key: string) => boolean;
  loadCooldowns: () => Promise<void>;
  saveCooldowns: () => Promise<void>;
}

export const useMapStore = create<MapState>((set, get) => ({
  checkpoints: [],
  races: [],
  doneCheckpoints: new Set<string>(),
  allCheckIns: [],
  currentPosition: null,
  smoothedPosition: null,
  gpsAccuracy: 999,
  gpsStatus: 'loading',
  routeCoords: null,
  nearestCheckpoint: null,
  isRegistering: false,
  cooldowns: {},

  loadCheckpoints: async () => {
    const { data: races } = await getActiveRaces();
    if (!races || races.length === 0) {
      set({ checkpoints: [], races: [] });
      return;
    }

    const raceIds = races.map((r) => r.race_id);
    const { data: cps } = await getCheckpointsByRaceIds(raceIds);

    const mapCps: MapCheckpoint[] = (cps || []).map((cp) => ({
      ...cp,
      raceId: cp.race_id,
      order: cp.cp_order,
    }));

    set({ checkpoints: mapCps, races });
  },

  loadHistory: async (runnerId: string) => {
    const { data: checkIns } = await getCheckInsByRunner(runnerId);
    if (!checkIns) {
      set({ allCheckIns: [], doneCheckpoints: new Set() });
      return;
    }

    // Mark today's check-ins as done
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const done = new Set<string>();

    for (const ci of checkIns) {
      const ciDate = new Date(ci.timestamp);
      if (ciDate >= today) {
        done.add(doneKey(ci.race_id, ci.checkpoint_order));
      }
    }

    set({ allCheckIns: checkIns, doneCheckpoints: done });
  },

  setPosition: (pos) =>
    set({ currentPosition: pos, gpsAccuracy: pos.accuracy }),

  setSmoothedPosition: (pos) => set({ smoothedPosition: pos }),

  setGpsStatus: (status) => set({ gpsStatus: status }),

  setRouteCoords: (coords) => set({ routeCoords: coords }),

  setNearestCheckpoint: (cp) => set({ nearestCheckpoint: cp }),

  markDone: (raceId, order) =>
    set((state) => {
      const newDone = new Set(state.doneCheckpoints);
      newDone.add(doneKey(raceId, order));
      return { doneCheckpoints: newDone };
    }),

  isDone: (raceId, order) => get().doneCheckpoints.has(doneKey(raceId, order)),

  setIsRegistering: (val) => set({ isRegistering: val }),

  setCooldown: (key) => {
    const cooldowns = { ...get().cooldowns, [key]: Date.now() };
    set({ cooldowns });
    get().saveCooldowns();
  },

  isCoolingDown: (key) => {
    const ts = get().cooldowns[key];
    if (!ts) return false;
    return Date.now() - ts < CONFIG.COOLDOWN_MS;
  },

  loadCooldowns: async () => {
    try {
      const raw = await AsyncStorage.getItem('tur_cooldowns');
      if (raw) {
        const cooldowns = JSON.parse(raw);
        // Remove expired
        const now = Date.now();
        const filtered: Record<string, number> = {};
        for (const [k, v] of Object.entries(cooldowns)) {
          if (now - (v as number) < CONFIG.COOLDOWN_MS) {
            filtered[k] = v as number;
          }
        }
        set({ cooldowns: filtered });
      }
    } catch {}
  },

  saveCooldowns: async () => {
    try {
      await AsyncStorage.setItem('tur_cooldowns', JSON.stringify(get().cooldowns));
    } catch {}
  },
}));
