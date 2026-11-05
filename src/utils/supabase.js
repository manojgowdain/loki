import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gmcsosyyxbozesxzxxmy.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_f8AyCLp2cNEtEGIXKpqztQ_lJU901RI';

export const supabase = createClient(supabaseUrl, supabaseKey);
