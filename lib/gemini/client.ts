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
  detail: string;
}

/**
 * Testa a chave e o modelo com uma geração mínima (poucos tokens). Só consultar o modelo não basta:
 * o Google ainda lista modelos que já não aceitam geração para contas novas.
 */
export async function checkGemini(): Promise<GeminiHealth> {
  const key = process.env.GOOGLE_GEMINI_API_KEY ?? "";
  const base = { keyConfigured: key.length > 0, keyLooksLikeAiStudio: key.startsWith("AIza"), model: GEMINI_MODEL };
  if (!key) return { ...base, status: "missing_key", httpStatus: 0, reason: "", detail: "" };
  try {
    const res = await postGenerate(key, { maxOutputTokens: 16 }, { contents: [{ role: "user", parts: [{ text: "Responda apenas: ok" }] }] });
    if (res.ok) return { ...base, status: "ok", httpStatus: res.status, reason: "", detail: "" };
    const { reason, detail } = await errorInfo(res);
    return { ...base, status: "rejected", httpStatus: res.status, reason, detail };
  } catch {
    return { ...base, status: "unreachable", httpStatus: 0, reason: "", detail: "" };
  }
}

// gemini-2.5-flash deixou de estar disponível para contas novas; o próprio Google indica a família 3.x.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const TIMEOUT_MS = 24_000;
const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Pouco "raciocínio" = resposta mais rápida. A família 2.5 usa orçamento; a 3.x usa nível. */
function thinkingFor(model: string): Record<string, unknown> {
  return model.startsWith("gemini-2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "low" };
}

/** Envia ao Gemini. Se o modelo recusar a opção de raciocínio, tenta de novo sem ela. */
async function postGenerate(key: string, generationConfig: Record<string, unknown>, rest: Record<string, unknown>): Promise<Response> {
  const send = (config: Record<string, unknown>) =>
    fetch(ENDPOINT(GEMINI_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      body: JSON.stringify({ ...rest, generationConfig: config }),
    });
  const res = await send({ ...generationConfig, thinkingConfig: thinkingFor(GEMINI_MODEL) });
  if (res.status !== 400) return res;
  const { detail } = await errorInfo(res.clone());
  return /thinking/i.test(detail) ? send(generationConfig) : res;
}

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
    res = await postGenerate(
      key,
      { temperature: 0.4, maxOutputTokens, responseMimeType: "application/json", responseSchema: schema },
      { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] },
    );
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
