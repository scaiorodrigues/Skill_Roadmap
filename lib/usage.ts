import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClaimResult = "ok" | "bucket" | "global";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export const LIMITS = {
  analysisPerIp: () => num(process.env.ANALYSIS_DAILY_LIMIT_PER_IP, 3),
  customPerIp: () => num(process.env.CUSTOM_DAILY_LIMIT_PER_IP, 6),
  global: () => num(process.env.ANALYSIS_DAILY_LIMIT_GLOBAL, 300),
};

/**
 * Identifica o visitante só por um hash do IP (nunca guardamos o IP em si).
 * A chave do hash é um segredo do servidor, para o hash não poder ser revertido.
 */
export function visitorBucket(request: Request, prefix: "analysis" | "custom" | "health"): string {
  const ip =
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only";
  return `${prefix}:${createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32)}`;
}

/** Reserva 1 uso do dia. Se o banco falhar, a chamada falha (nunca libera a IA sem controle de custo). */
export async function claimUsage(bucket: string, perVisitorLimit: number): Promise<ClaimResult> {
  const { data, error } = await createAdminClient().rpc("claim_usage", {
    p_bucket: bucket,
    p_limit: perVisitorLimit,
    p_global_limit: LIMITS.global(),
  });
  if (error || (data !== "ok" && data !== "bucket" && data !== "global")) throw new Error("Falha ao verificar o limite de uso");
  return data;
}

/** Devolve a reserva quando a IA falha. */
export async function releaseUsage(bucket: string): Promise<void> {
  await createAdminClient().rpc("release_usage", { p_bucket: bucket });
}
