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
/**
 * Um modelo que está trabalhando começa a mandar texto em poucos segundos. Se nada chegar nesse prazo,
 * ele provavelmente está travado por sobrecarga: desistimos dele e tentamos o próximo.
 */
const firstChunkTimeoutMs = () => Number(process.env.GEMINI_FIRST_CHUNK_TIMEOUT_MS) || 10_000;

const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

/** Pouco "raciocínio" = resposta mais rápida. A família 2.5 usa orçamento; a 3.x usa nível. */
function thinkingFor(model: string): Record<string, unknown> {
  return model.startsWith("gemini-2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "low" };
}

class StalledError extends Error {}

interface Generated {
  text: string;
  finishReason: string;
}

type ChunkBody = { candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[] };

/**
 * Pede a geração em fluxo (SSE) e junta o texto. Aborta se o primeiro pedaço não chegar a tempo
 * ou se o prazo total acabar. Devolve a resposta HTTP quando o Google recusa o pedido.
 */
async function streamOnce(
  key: string,
  model: string,
  deadline: number,
  generationConfig: Record<string, unknown>,
  rest: Record<string, unknown>,
): Promise<Generated | Response> {
  const controller = new AbortController();
  const total = setTimeout(() => controller.abort(), Math.max(0, deadline - Date.now()));
  const firstChunk = setTimeout(() => controller.abort(), Math.min(firstChunkTimeoutMs(), Math.max(0, deadline - Date.now())));
  try {
    const res = await fetch(ENDPOINT(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: controller.signal,
      cache: "no-store",
      body: JSON.stringify({ ...rest, generationConfig }),
    });
    if (!res.ok || !res.body) {
      clearTimeout(firstChunk);
      return res;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let finishReason = "";
    let gotData = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (!gotData) {
          gotData = true;
          clearTimeout(firstChunk);
        }
        const chunk = JSON.parse(payload) as ChunkBody;
        const c = chunk.candidates?.[0];
        text += c?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
        if (c?.finishReason) finishReason = c.finishReason;
      }
    }
    return { text, finishReason };
  } catch {
    throw new StalledError();
  } finally {
    clearTimeout(total);
    clearTimeout(firstChunk);
  }
}

/** Uma tentativa num modelo. Se ele recusar a opção de raciocínio, repete sem ela. */
async function attempt(
  key: string,
  model: string,
  deadline: number,
  generationConfig: Record<string, unknown>,
  rest: Record<string, unknown>,
): Promise<Generated | Response> {
  const first = await streamOnce(key, model, deadline, { ...generationConfig, thinkingConfig: thinkingFor(model) }, rest);
  if (!(first instanceof Response) || first.status !== 400) return first;
  const { detail } = await errorInfo(first.clone());
  return /thinking/i.test(detail) ? streamOnce(key, model, deadline, generationConfig, rest) : first;
}

/**
 * Tenta os modelos em ordem até um responder, dentro do orçamento de tempo.
 * Devolve o texto gerado e o modelo que respondeu; senão, lança o último erro.
 */
async function generateWithFallback(
  key: string,
  generationConfig: Record<string, unknown>,
  rest: Record<string, unknown>,
): Promise<Generated & { model: string }> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError = new GeminiError("Nenhum modelo de IA respondeu", 503, "UNAVAILABLE");
  for (const model of modelCandidates()) {
    if (deadline - Date.now() < MIN_ATTEMPT_MS) break;
    let out: Generated | Response;
    try {
      out = await attempt(key, model, deadline, generationConfig, rest);
    } catch {
      lastError = new GeminiError("A IA não respondeu a tempo", 504, "TIMEOUT", `O modelo ${model} não começou a responder a tempo.`);
      continue;
    }
    if (!(out instanceof Response)) return { ...out, model };
    const { reason, detail } = await errorInfo(out);
    lastError = new GeminiError(`Gemini respondeu ${out.status}`, out.status, reason, detail);
    if (!TRY_NEXT_MODEL.has(out.status)) break; // chave, permissão ou pedido inválido: outro modelo não resolve
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

  const { text, finishReason, model } = await generateWithFallback(
    key,
    { temperature: 0.4, maxOutputTokens, responseMimeType: "application/json", responseSchema: schema },
    { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] },
  );
  if (!text) throw new GeminiError("Resposta vazia da IA", 502);
  if (finishReason === "MAX_TOKENS") throw new GeminiError("Resposta da IA cortada", 502);

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
    const { model } = await generateWithFallback(key, { maxOutputTokens: 16 }, { contents: [{ role: "user", parts: [{ text: "Responda apenas: ok" }] }] });
    return { ...base, respondedModel: model, status: "ok", httpStatus: 200, reason: "", detail: "" };
  } catch (e) {
    if (e instanceof GeminiError && e.status !== 504) {
      return { ...base, respondedModel: "", status: "rejected", httpStatus: e.status, reason: e.reason, detail: e.detail };
    }
    const detail = e instanceof GeminiError ? e.detail : "";
    return { ...base, respondedModel: "", status: "unreachable", httpStatus: 0, reason: "TIMEOUT", detail };
  }
}
