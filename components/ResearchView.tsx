"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CareerCards } from "@/components/CareerCards";
import { CustomPathForm } from "@/components/CustomPathForm";
import { getResearch, listResearches, saveResearch } from "@/lib/storage/db";
import type { CareerOption } from "@/types/career";
import type { Research } from "@/types/research";

export function ResearchView({ id }: { id: string }) {
  const router = useRouter();
  const [research, setResearch] = useState<Research | null | undefined>(undefined);
  const [others, setOthers] = useState<Research[]>([]);
  const [compareWith, setCompareWith] = useState("");

  useEffect(() => {
    (async () => {
      setResearch(await getResearch(id));
      setOthers((await listResearches()).filter((r) => r.id !== id));
    })().catch(() => setResearch(null));
  }, [id]);

  if (research === undefined) return <p className="text-sm text-slate-600">Carregando…</p>;
  if (research === null) {
    return (
      <p className="text-sm text-slate-700">
        Pesquisa não encontrada neste aparelho. <Link href="/historico" className="underline">Ver histórico</Link>
      </p>
    );
  }

  async function addCustom(custom: CareerOption) {
    const updated: Research = { ...research!, result: { ...research!.result, custom } };
    await saveResearch(updated);
    setResearch(updated);
  }

  const { summary, result } = research;
  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-slate-100 p-4 text-sm">
        <p className="font-medium">{research.title}</p>
        <p className="mt-1">
          <strong>{summary.currentRole}</strong> · {summary.seniority} · {summary.careerYears} anos de carreira
        </p>
        {summary.topSkills.length > 0 && <p className="mt-1 text-slate-600">Skills fortes: {summary.topSkills.join(", ")}</p>}
        {summary.strengths.length > 0 && <p className="mt-1 text-slate-600">Pontos fortes: {summary.strengths.join("; ")}</p>}
      </section>
      <p className="text-xs text-slate-500">{result.disclaimer}</p>

      <CareerCards options={result.options} custom={result.custom} />
      {!result.custom && <CustomPathForm profile={research.profile} onAdded={addCustom} />}

      {others.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">Comparar com outra pesquisa</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor="compare-with" className="sr-only">Pesquisa para comparar</label>
            <select id="compare-with" value={compareWith} onChange={(e) => setCompareWith(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
              <option value="">Escolha uma pesquisa…</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
            <button
              disabled={!compareWith}
              onClick={() => router.push(`/comparar?a=${research.id}&b=${compareWith}`)}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Comparar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
