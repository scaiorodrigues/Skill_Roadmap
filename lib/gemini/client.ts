import "server-only";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
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

  if (!res.ok) throw new GeminiError(`Gemini respondeu ${res.status}`, res.status);

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
