import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';
import {
  supabase,
  getRunner,
  getAdminByEmail,
  getAdminByCode,
  upsertRunner,
  updateRunnerAdmin,
  type Runner,
  type Admin,
} from '../services/supabase';

const PENDING_SIGNUP_KEY = 'tur_pending_signup';

export async function savePendingSignup(name: string, adminCode: string | null) {
  try {
    await AsyncStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify({ name, adminCode }));
  } catch {}
}

export async function clearPendingSignup() {
  try {
    await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {}
}

async function consumePendingSignup(): Promise<{ name: string; adminCode: string | null } | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export type UserRole = 'superadmin' | 'admin' | 'runner' | null;

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  adminCode: string | null;
  raceId: string | null; // the admin_code this runner belongs to
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: CurrentUser | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  resolveUser: (authId: string, email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const authUser = data.session.user;
        await get().resolveUser(
          authUser.id,
          authUser.email ?? '',
          authUser.user_metadata?.full_name ?? authUser.email ?? ''
        );
      }
    } catch (err) {
      console.warn('Auth init error:', err);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  resolveUser: async (authId: string, email: string, name: string) => {
    const isSuperAdmin = email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase();

    if (isSuperAdmin) {
      set({
        user: {
          id: authId,
          name,
          email,
          role: 'superadmin',
          adminCode: null,
          raceId: null,
        },
      });
      return;
    }

    // Check if admin
    const [adminRes, runnerRes] = await Promise.all([
      getAdminByEmail(email),
      getRunner(authId),
    ]);

    if (adminRes.data) {
      const admin: Admin = adminRes.data;
      set({
        user: {
          id: authId,
          name,
          email,
          role: 'admin',
          adminCode: admin.admin_code,
          raceId: admin.admin_code,
        },
      });

      // Also ensure runner record exists for admin
      if (!runnerRes.data) {
        await upsertRunner({
          id: authId,
          name,
          email,
          race_id: admin.admin_code,
        });
      }
      return;
    }

    // Regular runner
    const runner: Runner | null = runnerRes.data;
    if (runner) {
      // Update name/email if changed
      if (runner.name !== name || runner.email !== email) {
        await supabase.from('runners').update({ name, email }).eq('id', authId);
      }

      // Check if previous admin was reactivated
      if (!runner.race_id && runner.prev_race_id) {
        const { data: prevAdmin } = await getAdminByCode(runner.prev_race_id);
        if (prevAdmin) {
          await updateRunnerAdmin(authId, runner.prev_race_id);
          runner.race_id = runner.prev_race_id;
        }
      }

      set({
        user: {
          id: authId,
          name: runner.name || name,
          email: runner.email || email,
          role: 'runner',
          adminCode: null,
          raceId: runner.race_id,
        },
      });
    } else {
      // New runner — apply pending signup data (deltakerkode entered before
      // e-mail confirmation) if present and still valid
      const pending = await consumePendingSignup();
      let raceId: string | null = null;
      if (pending?.adminCode) {
        const { data: admin } = await getAdminByCode(pending.adminCode);
        if (admin) raceId = pending.adminCode;
      }
      const runnerName = pending?.name || name;

      await upsertRunner({ id: authId, name: runnerName, email, race_id: raceId });
      set({
        user: {
          id: authId,
          name: runnerName,
          email,
          role: 'runner',
          adminCode: null,
          raceId,
        },
      });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, loading: false });
  },
}));
