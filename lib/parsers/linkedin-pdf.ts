import type { LinkedInProfile } from "@/types/linkedin";
import { MAX_RAW_TEXT, sanitizeLinkedInProfile } from "./linkedin";

const MAX_PAGES = 20;
const MIN_TEXT = 200;

/** Limpa o texto extraído do PDF: tira rodapés de paginação e linhas repetidas em branco. */
export function cleanPdfText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => !/^(page|página)\s+\d+\s+(of|de)\s+\d+$/i.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Monta o perfil a partir do texto do PDF. A IA estrutura o conteúdo na hora da análise. */
export function profileFromPdfText(rawText: string): LinkedInProfile {
  const text = cleanPdfText(rawText);
  if (text.length < MIN_TEXT) {
    throw new Error(
      "Não encontramos texto suficiente no PDF. Use o PDF gerado pelo LinkedIn (Perfil → Mais → Salvar em PDF), não uma imagem escaneada.",
    );
  }
  return sanitizeLinkedInProfile({ source: "pdf", rawText: text.slice(0, MAX_RAW_TEXT) });
}

/** Extrai o texto de um PDF no navegador (pdf.js). Não envia o arquivo para lugar nenhum. */
export async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.js", import.meta.url).toString();

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: bytes }).promise;
  } catch {
    throw new Error("Não foi possível abrir o PDF. Confira se o arquivo não está protegido por senha ou corrompido.");
  }

  const pages = Math.min(doc.numPages, MAX_PAGES);
  const parts: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    let line = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      line += item.hasEOL ? "\n" : " ";
    }
    parts.push(line);
  }
  return { text: parts.join("\n\n"), pages: doc.numPages };
}
