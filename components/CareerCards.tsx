"use client";

import { useMemo, useState } from "react";
import type { CareerOption } from "@/types/career";
import { formatBrl } from "@/lib/format";

const STRESS_ORDER = { baixo: 0, médio: 1, alto: 2 } as const;
const STRESS_STYLE = {
  baixo: "bg-green-100 text-green-800",
  médio: "bg-amber-100 text-amber-800",
  alto: "bg-red-100 text-red-800",
} as const;

type Sort = "salario" | "stress";

function Card({ o, mine }: { o: CareerOption; mine?: boolean }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">{o.title}</h3>
        {mine && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">Seu caminho</span>}
      </div>
      <p className="mt-1 text-sm text-slate-600">{o.summary}</p>
      <p className="mt-3 text-2xl font-bold">
        {formatBrl(o.salaryBrl.min)} – {formatBrl(o.salaryBrl.max)}
        <span className="text-sm font-normal text-slate-500"> /mês</span>
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        {o.salaryRemote && (<div><dt className="inline text-slate-500">Remoto: </dt><dd className="inline">{o.salaryRemote}</dd></div>)}
        {o.salaryAbroad && (<div><dt className="inline text-slate-500">Exterior: </dt><dd className="inline">{o.salaryAbroad}</dd></div>)}
        <div><dt className="inline text-slate-500">Vagas em: </dt><dd className="inline">{o.geography}</dd></div>
      </dl>
      <p className="mt-3 text-sm">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STRESS_STYLE[o.stress]}`}>Stress {o.stress}</span>{" "}
        <span className="text-slate-600">{o.stressNote}</span>
      </p>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium">Benefícios</p>
          <ul className="list-disc pl-5 text-slate-600">{o.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
        <div>
          <p className="font-medium">Reclamações comuns</p>
          <ul className="list-disc pl-5 text-slate-600">{o.complaints.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      </div>
      <p className="mt-3 text-sm"><span className="font-medium">Por que combina: </span>{o.whyFit}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {o.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">#{t}</span>)}
      </div>
      <button disabled className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500" title="Disponível na próxima etapa">
        Escolher este caminho (em breve)
      </button>
    </article>
  );
}

export function CareerCards({ options, custom }: { options: CareerOption[]; custom: CareerOption | null }) {
  const all = useMemo(() => (custom ? [...options, custom] : options), [options, custom]);
  const [active, setActive] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("salario");

  const tags = useMemo(() => Array.from(new Set(all.flatMap((o) => o.tags))).sort(), [all]);

  // Filtrar e reordenar acontece aqui no navegador: não consome nova análise de IA.
  const shown = useMemo(() => {
    const filtered = all.filter((o) => active.every((t) => o.tags.includes(t)));
    return [...filtered].sort((a, b) =>
      sort === "salario" ? b.salaryBrl.max - a.salaryBrl.max : STRESS_ORDER[a.stress] - STRESS_ORDER[b.stress] || b.salaryBrl.max - a.salaryBrl.max,
    );
  }, [all, active, sort]);

  const toggle = (t: string) => setActive((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tag">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => toggle(t)}
            aria-pressed={active.includes(t)}
            className={`rounded-full border px-3 py-1 text-xs ${active.includes(t) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
          >
            #{t}
          </button>
        ))}
        {active.length > 0 && <button onClick={() => setActive([])} className="text-xs text-slate-500 underline">limpar filtros</button>}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <label htmlFor="sort">Ordenar por</label>
        <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
          <option value="salario">Maior salário</option>
          <option value="stress">Menor nível de stress</option>
        </select>
      </div>
      <div className="mt-4 grid gap-4">
        {shown.length === 0 && <p className="text-sm text-slate-600">Nenhum caminho tem todas essas tags. Tire algum filtro.</p>}
        {shown.map((o) => <Card key={o.id} o={o} mine={custom?.id === o.id} />)}
      </div>
    </section>
  );
}
