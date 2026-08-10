import { createClient } from "@supabase/supabase-js";

// Cliente com a service_role — ignora RLS. USO SERVER-SIDE APENAS (nunca no browser).
// Depende de SUPABASE_SERVICE_ROLE_KEY no ambiente (Vercel).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
