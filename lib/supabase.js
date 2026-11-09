import { createClient } from '@supabase/supabase-js';

// Conexión directa a Supabase
const supabaseUrl = 'https://wezureybbkhkhvjfqkhc.supabase.co';
const supabaseAnonKey = "sb_publishable_P7z4ThzWN4UJsS0a9So9Vw_xalreiRB";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);