import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service role: apenas em rotas de API do servidor. Ignora RLS. */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
