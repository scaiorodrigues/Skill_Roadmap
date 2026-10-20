"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { compareResearches, type Comparison } from "@/lib/compare";
import { formatBrl } from "@/lib/format";
import { getResearch, listComparisons, saveComparison } from "@/lib/storage/db";

const when = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatBrl(Math.abs(n))}`;

function Chips({ items, tone }: { items: string[]; tone: "add" | "remove" }) {
  if (items.length === 0) return <span className="text-slate-500">nenhuma</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className={`rounded-full px-2 py-0.5 text-xs ${tone === "add" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}`}>{i}</span>
      ))}
    </span>
  );
}

export function CompareView({ a, b }: { a: string; b: string }) {
  const [cmp, setCmp] = useState<Comparison | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const [x, y] = await Promise.all([getResearch(a), getResearch(b)]);
      if (!x || !y || x.id === y.id) return setCmp(null);
      setCmp(compareResearches(x, y));
      // Registra no histórico. O id depende só do par (em qualquer ordem), então abrir a mesma
      // comparação de novo, ou em duas abas, nunca cria um segundo registro.
      const id = [a, b].sort().join("__");
      const existing = await listComparisons();
      if (!existing.some((c) => c.id === id)) {
        await saveComparison({ id, createdAt: new Date().toISOString(), aId: a, bId: b });
      }
    })().catch(() => setCmp(null));
  }, [a, b]);

  if (cmp === undefined) return <p className="text-sm text-slate-600">Carregando…</p>;
  if (cmp === null) {
    return <p className="text-sm text-slate-700">Não foi possível comparar: escolha duas pesquisas diferentes. <Link href="/historico" className="underline">Voltar ao histórico</Link></p>;
  }
  const { older, newer, profile: p, options: o } = cmp;
  const nothing = !p.role && !p.seniority && p.careerYearsDelta === 0 && !p.skillsAdded.length && !p.skillsRemoved.length &&
    !p.certificationsAdded.length && !p.certificationsRemoved.length && !o.top && !o.added.length && !o.removed.length && !o.changed.length;

  return (
    <div className="space-y-6 text-sm">
      <p className="text-slate-600">
        <Link href={`/pesquisa?id=${older.id}`} className="underline">{older.title}</Link> ({when(older.createdAt)}) →{" "}
        <Link href={`/pesquisa?id=${newer.id}`} className="underline">{newer.title}</Link> ({when(newer.createdAt)})
      </p>
      {nothing && <p className="rounded-xl bg-slate-100 p-4">Nenhuma diferença relevante entre as duas pesquisas.</p>}

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Seu perfil</h2>
        {p.role && <p>Cargo: {p.role.from || "—"} → <strong>{p.role.to || "—"}</strong></p>}
        {p.seniority && <p>Senioridade: {p.seniority.from || "—"} → <strong>{p.seniority.to || "—"}</strong></p>}
        {p.careerYearsDelta !== 0 && <p>Tempo de carreira: {p.careerYearsDelta > 0 ? "+" : ""}{p.careerYearsDelta} ano(s)</p>}
        <p className="flex flex-wrap items-center gap-2">Skills novas: <Chips items={p.skillsAdded} tone="add" /></p>
        <p className="flex flex-wrap items-center gap-2">Skills que saíram: <Chips items={p.skillsRemoved} tone="remove" /></p>
        {(p.certificationsAdded.length > 0 || p.certificationsRemoved.length > 0) && (
          <p className="flex flex-wrap items-center gap-2">Certificações novas: <Chips items={p.certificationsAdded} tone="add" /></p>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Caminhos de carreira</h2>
        {o.top && <p>Caminho mais bem pago: {o.top.from} → <strong>{o.top.to}</strong></p>}
        {o.changed.length > 0 && (
          <ul className="space-y-1">
            {o.changed.map((c) => (
              <li key={c.title}>
                <strong>{c.title}</strong>: teto {signed(c.salaryMaxDelta)}, piso {signed(c.salaryMinDelta)}
                {c.stressFrom !== c.stressTo && <> · stress {c.stressFrom} → {c.stressTo}</>}
              </li>
            ))}
          </ul>
        )}
        <p className="flex flex-wrap items-center gap-2">Novos nesta pesquisa: <Chips items={o.added.map((x) => x.title)} tone="add" /></p>
        <p className="flex flex-wrap items-center gap-2">Que não aparecem mais: <Chips items={o.removed.map((x) => x.title)} tone="remove" /></p>
        <p className="text-xs text-slate-500">As faixas salariais são estimativas da IA e podem variar entre pesquisas mesmo sem mudança no mercado.</p>
      </section>
    </div>
  );
}
