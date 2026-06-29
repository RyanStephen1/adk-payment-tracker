import { createClient, SupabaseClient, AuthError, User } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
    }
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }
  return client;
}

export function getSupabaseClient(): SupabaseClient | null {
  try {
    return getClient();
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  return { user: data?.user ?? null, error };
}

export async function signUp(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await getClient().auth.signUp({ email, password });
  return { user: data?.user ?? null, error };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await getClient().auth.signOut();
  return { error };
}

export async function getSession(): Promise<{ user: User | null }> {
  const { data } = await getClient().auth.getSession();
  return { user: data?.session?.user ?? null };
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const { data: { subscription } } = getClient().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription?.unsubscribe();
}

export async function verifySupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getClient().from('sheets').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01' || error.code === '404' ||
          (error.message && error.message.includes('Could not find the table'))) {
        return { success: true, error: 'Schema mismatch: database tables do not exist yet.' };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error connecting to Supabase.' };
  }
}
