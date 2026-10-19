/** Parser de CSV (RFC 4180) com suporte a aspas, vírgulas e quebras de linha dentro de campos. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
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
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

/**
 * Converte o CSV em objetos usando a primeira linha que contém `requiredHeader`
 * (alguns arquivos do LinkedIn trazem linhas de aviso antes do cabeçalho).
 */
export function readTable(text: string, requiredHeader: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const headerIdx = rows.findIndex((r) => r.some((h) => h.trim() === requiredHeader));
  if (headerIdx === -1) return [];
  const headers = rows[headerIdx].map((h) => h.trim());
  return rows.slice(headerIdx + 1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
}
