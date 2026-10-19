import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Criptografa com pgcrypto (função encrypt_secret, só service_role). Retorna o bytea em formato hex do PostgREST. */
export async function encryptSecret(plain: string): Promise<string> {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) throw new Error("DATA_ENCRYPTION_KEY não configurada");
  const { data, error } = await createAdminClient().rpc("encrypt_secret", { plain, key });
  if (error || typeof data !== "string") throw new Error("Falha ao criptografar");
  return data;
}
