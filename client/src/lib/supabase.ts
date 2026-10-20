import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://pgokdsqumwbitqtptuom.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnb2tkc3F1bXdiaXRxdHB0dW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTgxMzAsImV4cCI6MjEwNzk3NDEzMH0.Gz5Ucovs16irYvWcog4CjIUe48etY7GqahrtUyxySLA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
