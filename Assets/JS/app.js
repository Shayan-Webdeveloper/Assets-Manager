const SUPABASE_URL = "https://xrszncsmkrvzokxtdood.supabase.co"; ; 
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_H1VgJQkTfALf9eYPatiqqA_wg6QgYJd";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);