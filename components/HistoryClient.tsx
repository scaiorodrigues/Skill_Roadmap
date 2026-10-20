"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { deleteComparison, deleteResearch, exportBackup, importBackup, listComparisons, listResearches } from "@/lib/storage/db";
import type { ComparisonRecord, Research } from "@/types/research";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export function HistoryClient() {
  const [researches, setResearches] = useState<Research[] | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setResearches(await listResearches());
    setComparisons(await listComparisons());
  }, []);

  useEffect(() => {
    reload().catch(() => {
      setResearches([]);
      setError("Não foi possível ler o histórico deste aparelho.");
    });
  }, [reload]);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 2 ? [cur[1], id] : [...cur, id]));

  async function remove(kind: "research" | "comparison", id: string) {
    if (kind === "research") await deleteResearch(id);
    else await deleteComparison(id);
    setConfirming(null);
    setSelected((cur) => cur.filter((x) => x !== id));
    await reload();
  }

  async function doExport() {
    const blob = new Blob([JSON.stringify(await exportBackup())], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `skill-roadmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage("Backup baixado. Guarde o arquivo: ele é a única cópia fora deste aparelho.");
  }

  async function doImport(file: File | undefined) {
    setError(null);
    setMessage(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return setError("Arquivo grande demais para ser um backup.");
    try {
      const { researches: r, comparisons: c } = await importBackup(JSON.parse(await file.text()));
      await reload();
      setMessage(`Backup importado: ${r} pesquisa(s) e ${c} comparação(ões).`);
    } catch (e) {
      setError(e instanceof SyntaxError ? "Este arquivo não é um backup válido." : e instanceof Error ? e.message : "Não foi possível importar.");
    }
  }

  if (researches === null) return <p className="text-sm text-slate-600">Carregando…</p>;
  const titleOf = (id: string) => researches.find((r) => r.id === id)?.title ?? "Pesquisa removida";

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Pesquisas</h2>
          <Link href={selected.length === 2 ? `/comparar?a=${selected[0]}&b=${selected[1]}` : "#"} aria-disabled={selected.length !== 2}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${selected.length === 2 ? "bg-slate-900 text-white" : "pointer-events-none bg-slate-200 text-slate-500"}`}>
            Comparar selecionadas ({selected.length}/2)
          </Link>
        </div>
        {researches.length === 0 && (
          <p className="mt-3 text-sm text-slate-600">
            Nenhuma pesquisa neste aparelho ainda. <Link href="/nova" className="underline">Fazer a primeira</Link>
          </p>
        )}
        <ul className="mt-3 space-y-2">
          {researches.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <input type="checkbox" id={`sel-${r.id}`} checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Selecionar ${r.title}`} />
              <Link href={`/pesquisa?id=${r.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block text-xs text-slate-500">
                  {when(r.createdAt)} · melhor: {r.result.options[0]?.title}
                </span>
              </Link>
              {confirming === r.id ? (
                <span className="flex items-center gap-2 text-sm">
                  Apagar?
                  <button onClick={() => remove("research", r.id)} className="rounded bg-red-600 px-2 py-1 text-white">Sim</button>
                  <button onClick={() => setConfirming(null)} className="rounded border px-2 py-1">Não</button>
                </span>
              ) : (
                <button onClick={() => setConfirming(r.id)} className="text-sm text-slate-500 underline">Apagar</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Comparações feitas</h2>
        {comparisons.length === 0 && <p className="mt-3 text-sm text-slate-600">Nenhuma comparação ainda. Marque duas pesquisas acima para comparar.</p>}
        <ul className="mt-3 space-y-2">
          {comparisons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <Link href={`/comparar?a=${c.aId}&b=${c.bId}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium">{titleOf(c.aId)} × {titleOf(c.bId)}</span>
                <span className="block text-xs text-slate-500">{when(c.createdAt)}</span>
              </Link>
              <button onClick={() => remove("comparison", c.id)} className="text-sm text-slate-500 underline">Apagar</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-slate-100 p-4 text-sm">
        <h2 className="font-semibold">Backup</h2>
        <p className="mt-1 text-slate-600">
          Seu histórico existe só neste navegador. Se você limpar os dados do navegador ou trocar de aparelho, ele se perde. Baixe um backup de vez em quando.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={doExport} disabled={researches.length === 0} className="rounded-lg bg-slate-900 px-4 py-1.5 font-medium text-white disabled:opacity-50">Baixar backup</button>
          <label htmlFor="import-file" className="cursor-pointer rounded-lg border border-slate-400 px-4 py-1.5 font-medium">Importar backup</label>
          <input id="import-file" type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {message && <p role="status" className="mt-3 text-green-700">{message}</p>}
        {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
      </section>
    </div>
  );
}
