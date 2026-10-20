"use client";

import { useMemo, useState } from "react";
import type { CareerOption, Demand, RemoteAvailability, Stress } from "@/types/career";
import { applyFilters, listPlaces, placeKey, salaryScale, type SortBy, type WorkMode } from "@/lib/career-filters";
import { formatBrl, formatBrlShort } from "@/lib/format";

const STRESS_LEVEL: Record<Stress, number> = { baixo: 1, médio: 2, alto: 3 };
const STRESS_FILL: Record<Stress, string> = { baixo: "bg-emerald-500", médio: "bg-amber-500", alto: "bg-red-500" };
const DEMAND_LEVEL: Record<Demand, number> = { baixa: 1, média: 2, alta: 3 };
const REMOTE_TEXT: Record<RemoteAvailability, string> = { comum: "Home office comum", possível: "Home office possível", raro: "Home office raro" };
const MODES: { value: WorkMode; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "presencial", label: "Presencial / híbrido" },
  { value: "remoto", label: "Home office" },
];

const range = (min: number, max: number) => `${formatBrlShort(min)} – ${formatBrlShort(max)}`;

function Icon({ name }: { name: "check" | "alert" | "home" | "pin" | "globe" | "flag" }) {
  const common = { "aria-hidden": true, viewBox: "0 0 24 24", className: "h-4 w-4 shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "check": return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
    case "alert": return <svg {...common}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>;
    case "home": return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
    case "pin": return <svg {...common}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "globe": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
    case "flag": return <svg {...common}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>;
  }
}

/** Escada de salários: cada etapa numa barra, todas na mesma escala para comparar cartões. */
function PathLadder({ o, scale }: { o: CareerOption; scale: number }) {
  const steps = o.steps ?? [];
  const topTitle = o.topRole?.title;
  return (
    <ol className="space-y-2.5" aria-label="Etapas do caminho">
      {steps.map((s, i) => {
        const isTop = s.title === topTitle;
        const left = (s.salaryBrl.min / scale) * 100;
        const width = Math.max(((s.salaryBrl.max - s.salaryBrl.min) / scale) * 100, 1.5);
        return (
          <li key={`${s.title}-${i}`} className="grid gap-1 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isTop ? "bg-emerald-500 text-[#fff]" : "bg-slate-200 text-slate-700"}`}>
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-sm ${isTop ? "font-semibold" : ""}`}>{s.title}</span>
                <span className="block text-xs text-slate-500">
                  {i === 0 ? "próximo passo" : isTop ? "topo do caminho" : "etapa"}{s.years ? ` · ${s.years}` : ""}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-2.5 flex-1 rounded-full bg-slate-100" aria-hidden="true">
                <div className={`absolute top-0 h-2.5 rounded-full ${isTop ? "bg-emerald-500" : "bg-sky-500"}`} style={{ left: `${left}%`, width: `${width}%` }} />
              </div>
              <span className="w-32 shrink-0 text-right text-xs tabular-nums text-slate-600">{range(s.salaryBrl.min, s.salaryBrl.max)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StressMeter({ stress, note }: { stress: Stress; note: string }) {
  const level = STRESS_LEVEL[stress];
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">Nível de stress</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="flex gap-1" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-2 w-6 rounded-full ${n <= level ? STRESS_FILL[stress] : "bg-slate-200"}`} />
          ))}
        </span>
        <span className="text-sm font-medium capitalize">{stress}</span>
      </div>
      {note && <p className="mt-1 text-xs text-slate-600">{note}</p>}
    </div>
  );
}

function DemandDots({ demand }: { demand: Demand }) {
  const level = DEMAND_LEVEL[demand];
  return (
    <span className="flex items-center gap-1" title={`Demanda ${demand}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= level ? "bg-sky-500" : "bg-slate-300"}`} />)}
      </span>
      <span className="text-xs text-slate-500">demanda {demand}</span>
    </span>
  );
}

function Card({ o, mine, headline, scale, place, mode }: {
  o: CareerOption; mine: boolean; headline: { label: string; salary: { min: number; max: number } }; scale: number; place: string; mode: WorkMode;
}) {
  const hasPath = (o.steps?.length ?? 0) > 0;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{o.title}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{o.summary}</p>
        </div>
        {mine && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">Seu caminho</span>}
      </div>

      <div className="mt-4 rounded-xl bg-slate-100 p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Icon name={mode === "remoto" ? "home" : place ? "pin" : "flag"} />
          {headline.label}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {formatBrl(headline.salary.min)} – {formatBrl(headline.salary.max)}
          <span className="text-sm font-normal text-slate-600"> /mês</span>
        </p>
      </div>

      {hasPath && (
        <section className="mt-5">
          <h4 className="mb-2 text-sm font-semibold">Caminho até o topo</h4>
          <PathLadder o={o} scale={scale} />
        </section>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StressMeter stress={o.stress} note={o.stressNote} />
        <div>
          <p className="text-xs font-medium text-slate-500">Trabalho remoto</p>
          {o.remote ? (
            <>
              <p className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${mode === "remoto" ? "text-sky-700 dark:text-sky-300" : ""}`}><Icon name="home" />{REMOTE_TEXT[o.remote.availability]}</p>
              <p className="mt-1 text-xs tabular-nums text-slate-600">Topo: {range(o.remote.salaryBrl.min, o.remote.salaryBrl.max)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">{o.salaryRemote || "Sem informação"}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">No exterior</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm"><Icon name="globe" />{o.salaryAbroad || "Pouco comum"}</p>
        </div>
      </div>

      {o.locations && o.locations.length > 0 ? (
        <section className="mt-5">
          <h4 className="mb-2 text-sm font-semibold">Onde estão as vagas (presencial / híbrido)</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {o.locations.map((l) => {
              const active = place && placeKey(place) === placeKey(l.place);
              return (
                <li key={l.place} className={`rounded-lg border px-3 py-2 ${active ? "border-sky-500" : "border-slate-200"}`}>
                  <p className="flex items-center gap-1.5 text-sm font-medium"><Icon name="pin" />{l.place}</p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <DemandDots demand={l.demand} />
                    <span className="text-xs tabular-nums text-slate-600">topo {range(l.salaryBrl.min, l.salaryBrl.max)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        o.geography && <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-600"><Icon name="pin" />{o.geography}</p>
      )}

      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <h4 className="mb-1 font-semibold">Benefícios</h4>
          <ul className="space-y-1">{o.benefits.map((b) => <li key={b} className="flex items-start gap-1.5 text-slate-700"><span className="mt-0.5 text-emerald-600 dark:text-emerald-400"><Icon name="check" /></span>{b}</li>)}</ul>
        </div>
        <div>
          <h4 className="mb-1 font-semibold">Reclamações comuns</h4>
          <ul className="space-y-1">{o.complaints.map((c) => <li key={c} className="flex items-start gap-1.5 text-slate-700"><span className="mt-0.5 text-amber-600 dark:text-amber-400"><Icon name="alert" /></span>{c}</li>)}</ul>
        </div>
      </div>

      <p className="mt-4 text-sm"><span className="font-semibold">Por que combina com você: </span>{o.whyFit}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {o.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">#{t}</span>)}
      </div>
      <button disabled className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500" title="Disponível na próxima etapa">
        Ver roadmap deste caminho (em breve)
      </button>
    </article>
  );
}

export function CareerCards({ options, custom }: { options: CareerOption[]; custom: CareerOption | null }) {
  const all = useMemo(() => (custom ? [...options, custom] : options), [options, custom]);
  const [tags, setTags] = useState<string[]>([]);
  const [place, setPlace] = useState("");
  const [mode, setMode] = useState<WorkMode>("todas");
  const [sort, setSort] = useState<SortBy>("salario");

  const allTags = useMemo(() => Array.from(new Set(all.flatMap((o) => o.tags))).sort(), [all]);
  const places = useMemo(() => listPlaces(all), [all]);
  const scale = useMemo(() => salaryScale(all), [all]);
  // Filtrar e reordenar acontece aqui no navegador: não consome nova análise de IA.
  const views = useMemo(() => applyFilters(all, { tags, place, mode, sort }), [all, tags, place, mode, sort]);

  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const anyFilter = tags.length > 0 || place !== "" || mode !== "todas";

  return (
    <section>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Modalidade de trabalho">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              aria-pressed={mode === m.value}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${mode === m.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}
            >
              {m.value === "remoto" && <Icon name="home" />}
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label htmlFor="place" className="flex items-center gap-2">
            <Icon name="pin" />Localidade
            <select id="place" value={mode === "remoto" ? "" : place} onChange={(e) => setPlace(e.target.value)} disabled={mode === "remoto" || places.length === 0}
              className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50">
              <option value="">Todas as localidades</option>
              {places.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label htmlFor="sort" className="flex items-center gap-2">
            Ordenar por
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortBy)} className="rounded-lg border border-slate-300 px-2 py-1">
              <option value="salario">Maior salário no topo</option>
              <option value="stress">Menor nível de stress</option>
            </select>
          </label>
        </div>
        {mode === "remoto" && <p className="text-xs text-slate-600">Em home office a localidade não importa: os salários mostrados são os de vagas remotas para empresas do Brasil.</p>}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tag">
            {allTags.map((t) => (
              <button key={t} onClick={() => toggleTag(t)} aria-pressed={tags.includes(t)}
                className={`rounded-full border px-3 py-1 text-xs ${tags.includes(t) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}>
                #{t}
              </button>
            ))}
          </div>
        )}
        {anyFilter && (
          <button onClick={() => { setTags([]); setPlace(""); setMode("todas"); }} className="text-xs text-slate-600 underline">limpar filtros</button>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-600" aria-live="polite">
        {views.length === all.length ? `${views.length} caminhos` : `${views.length} de ${all.length} caminhos`}
      </p>
      <div className="mt-2 grid gap-4">
        {views.length === 0 && <p className="text-sm text-slate-600">Nenhum caminho com esses filtros. Tire algum filtro para ver mais opções.</p>}
        {views.map((v) => (
          <Card key={v.option.id} o={v.option} mine={custom?.id === v.option.id} headline={v.headline} scale={scale} place={mode === "remoto" ? "" : place} mode={mode} />
        ))}
      </div>
    </section>
  );
}
