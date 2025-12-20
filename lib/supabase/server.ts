/**
 * Server-side Supabase Client
 *
 * This client is designed for use in Expo API routes (server-side).
 * Unlike the main client, it doesn't use AsyncStorage or any React Native APIs.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client
 * Does not use AsyncStorage - suitable for API routes
 */
export const supabaseServer = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
