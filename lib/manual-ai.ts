import { SYSTEM_PROMPT, buildCustomPrompt, buildOptionsPrompt, normalizeOption, normalizeOptions } from "@/lib/gemini/career-options";
import type { CareerOption, ProfileSummary } from "@/types/career";
import type { LinkedInProfile } from "@/types/linkedin";

/**
 * Modo "copiar e colar": a pessoa leva o pedido para o próprio assistente (ex.: Claude no claude.ai),
 * copia a resposta e cola de volta. Nada passa pelo servidor do app; a resposta é validada aqui.
 */
export const MANUAL_MODEL = "claude (copiar e colar)";
export const MANUAL_ASSISTANT_URL = "https://claude.ai/new";

const OPTION_EXAMPLE = `{
      "title": "Nome do caminho (área)",
      "summary": "O que se faz, em 1 frase curta",
      "whyFit": "Por que combina com o perfil, em 1 frase curta",
      "steps": [
        { "title": "Próximo cargo", "years": "1–3 anos", "salaryBrlMin": 9000, "salaryBrlMax": 13000 },
        { "title": "Cargo intermediário", "years": "3–5 anos", "salaryBrlMin": 14000, "salaryBrlMax": 20000 },
        { "title": "Cargo mais bem pago do caminho", "years": "6+ anos", "salaryBrlMin": 22000, "salaryBrlMax": 32000 }
      ],
      "remote": { "availability": "comum | possível | raro", "salaryBrlMin": 20000, "salaryBrlMax": 30000 },
      "locations": [
        { "place": "São Paulo, SP", "demand": "alta | média | baixa", "salaryBrlMin": 22000, "salaryBrlMax": 32000 }
      ],
      "salaryAbroad": "US$ 6–9 mil (ou vazio)",
      "stress": "baixo | médio | alto",
      "stressNote": "Motivo em até 8 palavras",
      "benefits": ["até 4 palavras", "...", "..."],
      "complaints": ["até 4 palavras", "...", "..."],
      "tags": ["remoto", "alta-demanda"]
    }`;

const FORMAT_RULES = `Formato da resposta:
- Responda SOMENTE com o JSON, sem texto antes ou depois.
- Valores em reais por mês, números inteiros (sem "R$" e sem pontos).
- Use exatamente as palavras indicadas em availability, demand e stress.`;

export function buildManualOptionsPrompt(p: LinkedInProfile): string {
  return `${SYSTEM_PROMPT}

${buildOptionsPrompt(p)}

${FORMAT_RULES}
- Exatamente 5 itens em "options", neste formato:
{
  "profileSummary": { "currentRole": "Cargo atual", "seniority": "júnior | pleno | sênior | liderança", "careerYears": 7, "topSkills": ["até 8"], "strengths": ["até 4"] },
  "options": [
    ${OPTION_EXAMPLE}
  ]
}`;
}

export function buildManualCustomPrompt(p: LinkedInProfile, interest: string): string {
  return `${SYSTEM_PROMPT}

${buildCustomPrompt(p, interest)}

${FORMAT_RULES}
- Um único caminho, neste formato:
${OPTION_EXAMPLE.replace(/^ {4}/gm, "")}`;
}

/** Tira o JSON do meio do texto colado (aceita blocos ```json e texto em volta). */
export function extractJson(pasted: string): unknown {
  const fenced = pasted.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : pasted).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Não encontrei o JSON na resposta. Copie a resposta inteira do Claude e cole aqui.");
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    throw new Error("A resposta colada está incompleta ou com erro de formato. Copie de novo a resposta inteira (use o botão de copiar do Claude).");
  }
}

export function parseManualOptions(pasted: string): { summary: ProfileSummary; options: CareerOption[] } {
  const raw = extractJson(pasted);
  try {
    return normalizeOptions(raw);
  } catch {
    throw new Error("A resposta não trouxe caminhos suficientes no formato pedido. Peça ao Claude para refazer seguindo o formato e cole de novo.");
  }
}

export function parseManualCustom(pasted: string): CareerOption {
  const option = normalizeOption(extractJson(pasted), 99);
  if (!option) throw new Error("A resposta não trouxe um caminho com etapas no formato pedido. Peça ao Claude para refazer e cole de novo.");
  return option;
}
