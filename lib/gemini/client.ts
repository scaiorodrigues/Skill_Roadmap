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

// gemini-2.5-flash deixou de estar disponível para contas novas; o próprio Google indica a família 3.x.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/**
 * Modelos reserva, usados quando o principal está sobrecarregado ou indisponível.
 * Os apelidos "-latest" do Google apontam sempre para a versão atual de cada linha.
 */
export const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-flash-latest,gemini-flash-lite-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export const modelCandidates = () => Array.from(new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]));

/** Tempo total para responder (a função do Netlify aguenta pouco mais que isso). */
const TOTAL_BUDGET_MS = 24_000;
/** Abaixo disso não vale começar outra tentativa. */
const MIN_ATTEMPT_MS = 3_000;
/** Sobrecarga, cota esgotada, modelo indisponível ou erro interno: vale tentar outro modelo. */
const TRY_NEXT_MODEL = new Set([404, 429, 500, 503]);

const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Pouco "raciocínio" = resposta mais rápida. A família 2.5 usa orçamento; a 3.x usa nível. */
function thinkingFor(model: string): Record<string, unknown> {
  return model.startsWith("gemini-2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "low" };
}

/** Envia a um modelo. Se ele recusar a opção de raciocínio, repete sem ela. */
async function postGenerate(
  key: string,
  model: string,
  timeoutMs: number,
  generationConfig: Record<string, unknown>,
  rest: Record<string, unknown>,
): Promise<Response> {
  const send = (config: Record<string, unknown>) =>
    fetch(ENDPOINT(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
      body: JSON.stringify({ ...rest, generationConfig: config }),
    });
  const res = await send({ ...generationConfig, thinkingConfig: thinkingFor(model) });
  if (res.status !== 400) return res;
  const { detail } = await errorInfo(res.clone());
  return /thinking/i.test(detail) ? send(generationConfig) : res;
}

/**
 * Tenta os modelos em ordem até um responder, dentro do orçamento de tempo.
 * Devolve a resposta bem-sucedida e o modelo que respondeu; senão, lança o último erro.
 */
async function generateWithFallback(
  key: string,
  generationConfig: Record<string, unknown>,
  rest: Record<string, unknown>,
): Promise<{ res: Response; model: string }> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError = new GeminiError("Nenhum modelo de IA respondeu", 503, "UNAVAILABLE");
  for (const model of modelCandidates()) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    let res: Response;
    try {
      res = await postGenerate(key, model, remaining, generationConfig, rest);
    } catch {
      lastError = new GeminiError("Tempo esgotado ou falha de rede ao chamar a IA", 504);
      continue;
    }
    if (res.ok) return { res, model };
    const { reason, detail } = await errorInfo(res);
    lastError = new GeminiError(`Gemini respondeu ${res.status}`, res.status, reason, detail);
    if (!TRY_NEXT_MODEL.has(res.status)) break; // chave, permissão ou pedido inválido: outro modelo não resolve
  }
  throw lastError;
}

interface GenerateJsonInput {
  system: string;
  prompt: string;
  /** Schema no formato OpenAPI aceito pelo Gemini (tipos em maiúsculas). */
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

/** Chama o Gemini (somente no servidor) e devolve o JSON da resposta e o modelo que respondeu. */
export async function generateJson<T = unknown>({
  system,
  prompt,
  schema,
  maxOutputTokens = 6000,
}: GenerateJsonInput): Promise<{ data: T; model: string }> {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new GeminiError("GOOGLE_GEMINI_API_KEY não configurada", 500);

  const { res, model } = await generateWithFallback(
    key,
    { temperature: 0.4, maxOutputTokens, responseMimeType: "application/json", responseSchema: schema },
    { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] },
  );

  const body = (await res.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };
  const candidate = body.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new GeminiError("Resposta vazia da IA", 502);
  if (candidate?.finishReason === "MAX_TOKENS") throw new GeminiError("Resposta da IA cortada", 502);

  try {
    return { data: JSON.parse(text) as T, model };
  } catch {
    throw new GeminiError("Resposta da IA não é um JSON válido", 502);
  }
}

export interface GeminiHealth {
  keyConfigured: boolean;
  /** Chaves do Google AI Studio começam com "AIza". */
  keyLooksLikeAiStudio: boolean;
  /** Modelos na ordem em que são tentados. */
  models: string[];
  /** Modelo que respondeu (vazio se nenhum). */
  respondedModel: string;
  /** "ok" quando algum modelo aceita a chave e gera texto. */
  status: "ok" | "missing_key" | "rejected" | "unreachable";
  httpStatus: number;
  reason: string;
  detail: string;
}

/**
 * Testa a chave e os modelos com uma geração mínima (poucos tokens). Só consultar o modelo não basta:
 * o Google ainda lista modelos que já não aceitam geração para contas novas.
 */
export async function checkGemini(): Promise<GeminiHealth> {
  const key = process.env.GOOGLE_GEMINI_API_KEY ?? "";
  const base = { keyConfigured: key.length > 0, keyLooksLikeAiStudio: key.startsWith("AIza"), models: modelCandidates() };
  if (!key) return { ...base, respondedModel: "", status: "missing_key", httpStatus: 0, reason: "", detail: "" };
  try {
    const { res, model } = await generateWithFallback(key, { maxOutputTokens: 16 }, { contents: [{ role: "user", parts: [{ text: "Responda apenas: ok" }] }] });
    return { ...base, respondedModel: model, status: "ok", httpStatus: res.status, reason: "", detail: "" };
  } catch (e) {
    if (e instanceof GeminiError && e.status !== 504) {
      return { ...base, respondedModel: "", status: "rejected", httpStatus: e.status, reason: e.reason, detail: e.detail };
    }
    return { ...base, respondedModel: "", status: "unreachable", httpStatus: 0, reason: "", detail: "" };
  }
}
