import { create } from 'zustand';
import { CONFIG } from '../constants/config';
import {
  supabase,
  getRunner,
  getAdminByEmail,
  upsertRunner,
  updateRunnerAdmin,
  type Runner,
  type Admin,
} from '../services/supabase';

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
        const { data: prevAdmin } = await getAdminByEmail(runner.prev_race_id);
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
      // New runner
      await upsertRunner({ id: authId, name, email, race_id: null });
      set({
        user: {
          id: authId,
          name,
          email,
          role: 'runner',
          adminCode: null,
          raceId: null,
        },
      });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, loading: false });
  },
}));
