import "server-only";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Código do Google, ex.: API_KEY_INVALID, PERMISSION_DENIED (nunca contém a chave). */
    readonly reason = "",
    /** Mensagem do Google, encurtada (nunca contém a chave). */
    readonly detail = "",
  ) {
    super(message);
  }

  /** Erro de configuração (chave, permissão, modelo), e não uma falha passageira. */
  get isConfigError(): boolean {
    return [400, 401, 403, 404].includes(this.status);
  }
}

async function errorInfo(res: Response): Promise<{ reason: string; detail: string }> {
  try {
    const body = (await res.json()) as { error?: { status?: string; message?: string; details?: { reason?: string }[] } };
    const key = process.env.GOOGLE_GEMINI_API_KEY ?? "";
    const detail = (body.error?.message ?? "").slice(0, 240);
    return {
      reason: (body.error?.details?.find((d) => d.reason)?.reason || body.error?.status || "").slice(0, 60),
      detail: key ? detail.split(key).join("[chave]") : detail,
    };
  } catch {
    return { reason: "", detail: "" };
  }
}

export interface GeminiHealth {
  keyConfigured: boolean;
  /** Chaves do Google AI Studio começam com "AIza". */
  keyLooksLikeAiStudio: boolean;
  model: string;
  /** "ok" quando o Google aceita a chave e o modelo. */
  status: "ok" | "missing_key" | "rejected" | "unreachable";
  httpStatus: number;
  reason: string;
}

/** Pergunta ao Google se a chave e o modelo são aceitos. Não gera texto, então não gasta cota de análise. */
export async function checkGemini(): Promise<GeminiHealth> {
  const key = process.env.GOOGLE_GEMINI_API_KEY ?? "";
  const base = { keyConfigured: key.length > 0, keyLooksLikeAiStudio: key.startsWith("AIza"), model: GEMINI_MODEL };
  if (!key) return { ...base, status: "missing_key", httpStatus: 0, reason: "" };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`, {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.ok) return { ...base, status: "ok", httpStatus: res.status, reason: "" };
    return { ...base, status: "rejected", httpStatus: res.status, reason: (await errorInfo(res)).reason };
  } catch {
    return { ...base, status: "unreachable", httpStatus: 0, reason: "" };
  }
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const TIMEOUT_MS = 24_000;

interface GenerateJsonInput {
  system: string;
  prompt: string;
  /** Schema no formato OpenAPI aceito pelo Gemini (tipos em maiúsculas). */
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

/** Chama o Gemini (somente no servidor) e devolve o JSON da resposta. */
export async function generateJson<T = unknown>({ system, prompt, schema, maxOutputTokens = 6000 }: GenerateJsonInput): Promise<T> {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new GeminiError("GOOGLE_GEMINI_API_KEY não configurada", 500);

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens,
          responseMimeType: "application/json",
          responseSchema: schema,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
  } catch {
    throw new GeminiError("Tempo esgotado ou falha de rede ao chamar a IA", 504);
  }

  if (!res.ok) {
    const { reason, detail } = await errorInfo(res);
    throw new GeminiError(`Gemini respondeu ${res.status}`, res.status, reason, detail);
  }

  const body = (await res.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };
  const candidate = body.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new GeminiError("Resposta vazia da IA", 502);
  if (candidate?.finishReason === "MAX_TOKENS") throw new GeminiError("Resposta da IA cortada", 502);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("Resposta da IA não é um JSON válido", 502);
  }
}
