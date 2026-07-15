import { createClient } from '@supabase/supabase-js';
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_KEY?.trim() ||
    "";
if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
}
else {
    console.warn("Supabase credentials missing. Database features are offline.");
}
export { supabase };
//# sourceMappingURL=supabase.js.map