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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('CRÍTICO: NEXT_PUBLIC_SUPABASE_URL não configurada ou inválida!');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  !supabaseUrl.includes('placeholder') && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'placeholder'
);
