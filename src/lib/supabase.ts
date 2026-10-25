
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gqwkoujhgcwpupahnksa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2tvdWpoZ2N3cHVwYWhua3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjYxNzAsImV4cCI6MjEwODQwMjE3MH0.JDQIEDksTP6FUIMdJKG62WyP2T9SUX4obz6icehj2KE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
