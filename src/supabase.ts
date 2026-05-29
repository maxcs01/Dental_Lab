import { createClient } from '@supabase/supabase-js';
import { Dentist, Job, HistoryRecord } from './types';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// --- DENTISTS MAP HELPERS ---
const mapDentistFromDb = (d: any): Dentist => ({
  id: d.id,
  name: d.name,
  address: d.address || '',
  phone: d.phone || '',
  useManualTotals: d.use_manual_totals,
  manualTotalReceber: Number(d.manual_total_receber) || 0,
  manualTotalRecebido: Number(d.manual_total_recebido) || 0,
});

const mapDentistToDb = (d: Dentist, userEmail?: string) => ({
  id: d.id,
  name: d.name,
  address: d.address,
  phone: d.phone,
  use_manual_totals: d.useManualTotals,
  manual_total_receber: d.manualTotalReceber,
  manual_total_recebido: d.manualTotalRecebido,
  created_by: (userEmail || 'odontologo@precisao.com').toLowerCase().trim(),
});

// --- JOBS MAP HELPERS ---
const mapJobFromDb = (j: any): Job => ({
  id: j.id,
  dentistId: j.dentist_id,
  patientName: j.patient_name,
  jobName: j.job_name,
  price: Number(j.price) || 0,
  dateType: j.date_type as 'inicio' | 'entrega',
  date: j.date,
  notes: j.notes || '',
  isPaid: j.is_paid,
  paymentDate: j.payment_date || undefined,
});

const mapJobToDb = (j: Job, userEmail?: string) => ({
  id: j.id,
  dentist_id: j.dentistId,
  patient_name: j.patientName,
  job_name: j.jobName,
  price: j.price,
  date_type: j.dateType,
  date: j.date,
  notes: j.notes,
  is_paid: j.isPaid,
  payment_date: j.paymentDate || null,
  created_by: (userEmail || 'odontologo@precisao.com').toLowerCase().trim(),
});

// --- HISTORY MAP HELPERS ---
const mapHistoryFromDb = (h: any): HistoryRecord => ({
  id: h.id,
  month: h.month,
  year: h.year,
  totalReceber: Number(h.total_receber) || 0,
  totalRecebido: Number(h.total_recebido) || 0,
  notes: h.notes || undefined,
});

const mapHistoryToDb = (h: HistoryRecord, userEmail?: string) => ({
  id: h.id,
  month: h.month,
  year: h.year,
  total_receber: h.totalReceber,
  total_recebido: h.totalRecebido,
  notes: h.notes || null,
  created_by: (userEmail || 'odontologo@precisao.com').toLowerCase().trim(),
});


// --- DATABASE API WRAPPERS ---

/**
 * Fetch all remote data from Supabase, filtered by logged in user
 */
export async function fetchRemoteData(userEmail?: string) {
  if (!supabase) return null;
  const email = (userEmail || 'odontologo@precisao.com').toLowerCase().trim();

  try {
    const [dentistsRes, jobsRes, historyRes] = await Promise.all([
      supabase.from('dentists').select('*').eq('created_by', email),
      supabase.from('jobs').select('*').eq('created_by', email),
      supabase.from('history_records').select('*').eq('created_by', email),
    ]);

    if (dentistsRes.error) throw dentistsRes.error;
    if (jobsRes.error) throw jobsRes.error;
    if (historyRes.error) throw historyRes.error;

    return {
      dentists: (dentistsRes.data || []).map(mapDentistFromDb),
      jobs: (jobsRes.data || []).map(mapJobFromDb),
      history: (historyRes.data || []).map(mapHistoryFromDb),
    };
  } catch (error) {
    console.error('Error fetching data from Supabase:', error);
    throw error;
  }
}

/**
 * Batch upload/sync local data to Supabase, writing correct user_id
 */
export async function syncLocalDataToSupabase(dentists: Dentist[], jobs: Job[], history: HistoryRecord[], userEmail?: string) {
  if (!supabase) return false;
  const email = (userEmail || 'odontologo@precisao.com').toLowerCase().trim();

  try {
    // Sync dentists
    if (dentists.length > 0) {
      const { error: dErr } = await supabase
        .from('dentists')
        .upsert(dentists.map(d => mapDentistToDb(d, email)), { onConflict: 'id' });
      if (dErr) throw dErr;
    }

    // Sync jobs
    if (jobs.length > 0) {
      const { error: jErr } = await supabase
        .from('jobs')
        .upsert(jobs.map(j => mapJobToDb(j, email)), { onConflict: 'id' });
      if (jErr) throw jErr;
    }

    // Sync history records
    if (history.length > 0) {
      const { error: hErr } = await supabase
        .from('history_records')
        .upsert(history.map(h => mapHistoryToDb(h, email)), { onConflict: 'id' });
      if (hErr) throw hErr;
    }

    return true;
  } catch (err) {
    console.error('Error hard-syncing local data to Supabase:', err);
    throw err;
  }
}

// --- INDIVIDUAL MUTATIONS ---

export async function saveDentistRemote(dentist: Dentist, userEmail?: string) {
  if (!supabase) return;
  const { error } = await supabase.from('dentists').upsert(mapDentistToDb(dentist, userEmail));
  if (error) {
    console.error('Error saving dentist remotely:', error);
    throw error;
  }
}

export async function deleteDentistRemote(id: string, userEmail?: string) {
  if (!supabase) return;
  const query = supabase.from('dentists').delete().eq('id', id);
  if (userEmail) {
    query.eq('created_by', userEmail.toLowerCase().trim());
  }
  const { error } = await query;
  if (error) {
    console.error('Error deleting dentist remotely:', error);
    throw error;
  }
}

export async function saveJobRemote(job: Job, userEmail?: string) {
  if (!supabase) return;
  const { error } = await supabase.from('jobs').upsert(mapJobToDb(job, userEmail));
  if (error) {
    console.error('Error saving job remotely:', error);
    throw error;
  }
}

export async function deleteJobRemote(id: string, userEmail?: string) {
  if (!supabase) return;
  const query = supabase.from('jobs').delete().eq('id', id);
  if (userEmail) {
    query.eq('created_by', userEmail.toLowerCase().trim());
  }
  const { error } = await query;
  if (error) {
    console.error('Error deleting job remotely:', error);
    throw error;
  }
}

export async function saveHistoryRecordRemote(record: HistoryRecord, userEmail?: string) {
  if (!supabase) return;
  const { error } = await supabase.from('history_records').upsert(mapHistoryToDb(record, userEmail));
  if (error) {
    console.error('Error saving history record remotely:', error);
    throw error;
  }
}

export async function deleteHistoryRecordRemote(id: string, userEmail?: string) {
  if (!supabase) return;
  const query = supabase.from('history_records').delete().eq('id', id);
  if (userEmail) {
    query.eq('created_by', userEmail.toLowerCase().trim());
  }
  const { error } = await query;
  if (error) {
    console.error('Error deleting history record remotely:', error);
    throw error;
  }
}

// --- REMOTE AUTH CHECKER ---
export async function signUpWithSupabaseAuth(email: string, password: string) {
  if (!supabase) throw new Error('Supabase no configured.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function signInWithSupabaseAuth(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('E-mail ou senha incorretos.');
    }
    throw error;
  }
  return data;
}

export async function signOutWithSupabaseAuth() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out from Supabase Auth:', error);
  }
}

export async function signInWithGoogleAuth() {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: true
    }
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function syncAccountsRemote(accounts: any[]) {
  // No-op to avoid using custom accounts database table
  return;
}

export async function registerAccountRemote(account: any) {
  // No-op to avoid using custom accounts database table
  return;
}

export async function fetchAccountRemoteByEmail(email: string) {
  // Always return null to avoid querying the custom accounts database table
  return null;
}

export async function fetchAccountsRemote() {
  // Always return empty array to prevent database query issues
  return [];
}
