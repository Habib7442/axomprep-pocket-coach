import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Standard client for public-only operations on the client-side.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Creates an authenticated Supabase client using a Clerk session token.
 */
export const createClerkSupabaseClient = (token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};
