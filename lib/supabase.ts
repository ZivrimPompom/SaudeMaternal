import { createClient } from '@supabase/supabase-js';

const getValidSupabaseUrl = (url: string | undefined): string => {
  if (!url) return 'https://placeholder.supabase.co';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
  } catch {
    // Not a valid URL
  }
  return 'https://placeholder.supabase.co';
};

const supabaseUrl = getValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Supabase credentials are missing or invalid. Check your .env file.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
