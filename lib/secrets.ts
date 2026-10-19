import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

function encryptionKey(): string {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) throw new Error("DATA_ENCRYPTION_KEY não configurada");
  return key;
}

/** Cifra com pgcrypto no banco (pgp_sym_encrypt). Retorna o bytea em formato aceito pelo PostgREST. */
export async function encryptSecret(plain: string): Promise<string> {
  const { data, error } = await createAdminClient().rpc("encrypt_secret", { plain, key: encryptionKey() });
  if (error || !data) throw new Error("Falha ao criptografar");
  return data as string;
}

export async function decryptSecret(cipher: string): Promise<string> {
  const { data, error } = await createAdminClient().rpc("decrypt_secret", { cipher, key: encryptionKey() });
  if (error || typeof data !== "string") throw new Error("Falha ao descriptografar");
  return data;
}
