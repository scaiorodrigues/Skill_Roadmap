import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Reserva a análise do ciclo. `nextAvailable` só vem preenchido quando o limite foi atingido. */
export async function claimAnalysis(userId: string): Promise<{ ok: true } | { ok: false; nextAvailable: string }> {
  const { data, error } = await createAdminClient().rpc("claim_analysis", { p_user: userId });
  if (error) throw new Error("Falha ao verificar o limite de análises");
  return data ? { ok: false, nextAvailable: data as string } : { ok: true };
}

/** Devolve a reserva quando a geração falha. */
export async function releaseAnalysis(userId: string): Promise<void> {
  await createAdminClient().rpc("release_analysis", { p_user: userId });
}
