import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Types ───
export interface Admin {
  id: string;
  email: string;
  admin_code: string;
  is_active: boolean;
  created_at: string;
}

export interface Race {
  id: number;
  race_id: string;
  admin_code: string;
  name: string;
  is_active: boolean;
  is_current: boolean;
  created_at: string;
}

export interface Checkpoint {
  id: string | number;
  race_id: string;
  cp_order: number;
  name: string;
  lat: number;
  lng: number;
}

export interface Runner {
  id: string;
  name: string;
  email: string;
  race_id: string | null;
  prev_race_id: string | null;
  created_at: string;
}

export interface CheckIn {
  id: string | number;
  runner_id: string;
  runner_name: string;
  checkpoint_name: string;
  checkpoint_order: number;
  lat_recorded: number;
  lng_recorded: number;
  accuracy_meters: number;
  elapsed_seconds: number | null;
  timestamp: string;
  race_id: string;
}

export interface Winner {
  id: string | number;
  winner_name: string;
  winner_id: string | null;
  admin_code: string;
  race_ids: string[];
  month: number;
  year: number;
  period_from: string;
  period_to: string;
  drawn_at: string;
}

// ─── Auth ───
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email);
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

// ─── Runners ───
export async function getRunner(userId: string) {
  return supabase.from('runners').select('*').eq('id', userId).single();
}

export async function upsertRunner(runner: Partial<Runner> & { id: string }) {
  return supabase.from('runners').upsert(runner);
}

export async function updateRunnerAdmin(runnerId: string, adminCode: string | null, prevCode?: string) {
  const update: any = { race_id: adminCode };
  if (prevCode) update.prev_race_id = prevCode;
  return supabase.from('runners').update(update).eq('id', runnerId);
}

export async function getRunnersByAdmin(adminCode: string) {
  return supabase.from('runners').select('*').eq('race_id', adminCode).order('name');
}

// ─── Admins ───
export async function getAdminByEmail(email: string) {
  return supabase.from('admins').select('*').eq('email', email).eq('is_active', true).single();
}

export async function getAdminByCode(code: string) {
  return supabase.from('admins').select('*').eq('admin_code', code).eq('is_active', true).single();
}

export async function getAllAdmins() {
  return supabase.from('admins').select('*').eq('is_active', true).order('created_at');
}

export async function addAdmin(email: string, adminCode: string) {
  return supabase.from('admins').upsert(
    { email, admin_code: adminCode, is_active: true },
    { onConflict: 'email' }
  );
}

export async function deactivateAdmin(adminId: string) {
  return supabase.from('admins').update({ is_active: false }).eq('id', adminId);
}

// ─── Races ───
export async function getActiveRaces() {
  return supabase.from('races').select('*').eq('is_active', true);
}

export async function getRacesByAdmin(adminCode: string) {
  return supabase.from('races').select('*').eq('admin_code', adminCode).eq('is_active', true);
}

export async function createRace(adminCode: string, raceId: string, name: string) {
  return supabase.from('races').insert({ admin_code: adminCode, race_id: raceId, name, is_active: true, is_current: true });
}

export async function deactivateRace(raceId: string) {
  return supabase.from('races').update({ is_active: false, is_current: false }).eq('race_id', raceId);
}

// ─── Checkpoints ───
export async function getCheckpointsByRaceIds(raceIds: string[]) {
  return supabase.from('checkpoints').select('*').in('race_id', raceIds).order('cp_order');
}

export async function createCheckpoint(checkpoint: Omit<Checkpoint, 'id'>) {
  return supabase.from('checkpoints').insert(checkpoint);
}

export async function deleteCheckpointsByRace(raceId: string) {
  return supabase.from('checkpoints').delete().eq('race_id', raceId);
}

// ─── Check-ins ───
export async function getCheckInsByRunner(runnerId: string) {
  return supabase.from('check_ins').select('*').eq('runner_id', runnerId).order('timestamp', { ascending: false });
}

export async function getCheckInsByDateRange(from: string, to: string, raceId?: string, adminCode?: string) {
  let query = supabase.from('check_ins').select('*').gte('timestamp', from).lte('timestamp', to);
  if (raceId) query = query.eq('race_id', raceId);
  return query.order('timestamp', { ascending: false });
}

export async function getLastCheckIn(runnerId: string, raceId: string) {
  return supabase
    .from('check_ins')
    .select('*')
    .eq('runner_id', runnerId)
    .eq('race_id', raceId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
}

export async function saveCheckIn(checkIn: Omit<CheckIn, 'id'>) {
  return supabase.from('check_ins').insert(checkIn);
}

// ─── Winners ───
export async function getWinner(month: number, year: number, adminCode: string) {
  return supabase
    .from('winners')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .eq('admin_code', adminCode)
    .single();
}

export async function getWinnersByRunner(runnerId: string, runnerName: string) {
  return supabase
    .from('winners')
    .select('*')
    .or(`winner_id.eq.${runnerId},winner_name.eq.${runnerName}`);
}

export async function saveWinner(winner: Omit<Winner, 'id'>) {
  return supabase.from('winners').insert(winner);
}

// ─── Counts (for status dashboard) ───
export async function getSystemCounts() {
  const [checkpoints, admins, runners, races] = await Promise.all([
    supabase.from('checkpoints').select('*', { count: 'exact', head: true }),
    supabase.from('admins').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('runners').select('*', { count: 'exact', head: true }),
    supabase.from('races').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);
  return {
    checkpoints: checkpoints.count ?? 0,
    admins: admins.count ?? 0,
    runners: runners.count ?? 0,
    races: races.count ?? 0,
  };
}
