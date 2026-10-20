import type { Backup, ComparisonRecord, Research } from "@/types/research";
import { parseBackup } from "./backup";

/** Tudo é guardado no IndexedDB deste navegador/aparelho. Nada disso vai para um servidor. */
const DB_NAME = "skill-roadmap";
const RESEARCHES = "researches";
const COMPARISONS = "comparisons";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RESEARCHES)) db.createObjectStore(RESEARCHES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(COMPARISONS)) db.createObjectStore(COMPARISONS, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("Não foi possível abrir o armazenamento do aparelho."));
  });
}

async function run<T>(stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const req = fn(tx);
    tx.oncomplete = () => {
      db.close();
      resolve(req ? req.result : undefined);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error("Falha ao gravar no aparelho. Verifique se há espaço e se o navegador permite armazenamento."));
    };
  });
}

const byDateDesc = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

export async function listResearches(): Promise<Research[]> {
  const all = (await run<Research[]>([RESEARCHES], "readonly", (tx) => tx.objectStore(RESEARCHES).getAll())) ?? [];
  return all.sort(byDateDesc);
}

export async function getResearch(id: string): Promise<Research | null> {
  return (await run<Research | undefined>([RESEARCHES], "readonly", (tx) => tx.objectStore(RESEARCHES).get(id))) ?? null;
}

export async function saveResearch(r: Research): Promise<void> {
  await run([RESEARCHES], "readwrite", (tx) => tx.objectStore(RESEARCHES).put(r));
}

/** Apaga a pesquisa e as comparações que dependiam dela. */
export async function deleteResearch(id: string): Promise<void> {
  const comparisons = await listComparisons();
  await run([RESEARCHES, COMPARISONS], "readwrite", (tx) => {
    tx.objectStore(RESEARCHES).delete(id);
    for (const c of comparisons) if (c.aId === id || c.bId === id) tx.objectStore(COMPARISONS).delete(c.id);
  });
}

export async function listComparisons(): Promise<ComparisonRecord[]> {
  const all = (await run<ComparisonRecord[]>([COMPARISONS], "readonly", (tx) => tx.objectStore(COMPARISONS).getAll())) ?? [];
  return all.sort(byDateDesc);
}

export async function saveComparison(c: ComparisonRecord): Promise<void> {
  await run([COMPARISONS], "readwrite", (tx) => tx.objectStore(COMPARISONS).put(c));
}

export async function deleteComparison(id: string): Promise<void> {
  await run([COMPARISONS], "readwrite", (tx) => tx.objectStore(COMPARISONS).delete(id));
}

/** Pede ao navegador para não apagar estes dados quando faltar espaço. */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* sem suporte: segue normalmente */
  }
}

export async function exportBackup(): Promise<Backup> {
  return { version: 1, exportedAt: new Date().toISOString(), researches: await listResearches(), comparisons: await listComparisons() };
}

/** Importa um backup, somando ao que já existe (mesmo id = substitui). */
export async function importBackup(raw: unknown): Promise<{ researches: number; comparisons: number }> {
  const b = parseBackup(raw);
  await run([RESEARCHES, COMPARISONS], "readwrite", (tx) => {
    for (const r of b.researches) tx.objectStore(RESEARCHES).put(r);
    for (const c of b.comparisons) tx.objectStore(COMPARISONS).put(c);
  });
  return { researches: b.researches.length, comparisons: b.comparisons.length };
}
