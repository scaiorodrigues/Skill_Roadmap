/** Parser de CSV com suporte a aspas, vírgulas e quebras de linha dentro de campos. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

/**
 * Lê uma tabela a partir da linha de cabeçalho que contém `requiredHeader`
 * (alguns exports do LinkedIn trazem linhas de aviso antes do cabeçalho).
 */
export function readTable(text: string, requiredHeader: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const headerIdx = rows.findIndex((r) => r.some((h) => h.trim() === requiredHeader));
  if (headerIdx === -1) return [];
  const header = rows[headerIdx].map((h) => h.trim());
  return rows.slice(headerIdx + 1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => {
      rec[h] = (r[i] ?? "").trim();
    });
    return rec;
  });
}
