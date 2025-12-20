import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables early to prevent runtime crashes
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase Client] CRITICAL: Missing environment variables');
  console.error('[Supabase Client] EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('[Supabase Client] EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
}

// Check if we're in a React Native environment (not Node.js server)
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isBrowser = typeof window !== 'undefined';

// Dynamically import AsyncStorage only in React Native environment
let storage: any = undefined;

if (isReactNative || isBrowser) {
  try {
    // Only import AsyncStorage if we're in a React Native environment
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    storage = AsyncStorage;
  } catch (error) {
    console.warn('[Supabase Client] AsyncStorage not available, using in-memory storage');
  }
}

// Create client with fallback empty strings to prevent crash during initialization
// The app will show proper error states when API calls fail
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      storage: storage,
      autoRefreshToken: isReactNative || isBrowser,
      persistSession: isReactNative || isBrowser,
      detectSessionInUrl: false,
    },
  }
);
