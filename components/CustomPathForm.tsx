"use client";

import { useState } from "react";
import { withTechnical } from "@/lib/format";
import type { CareerOption } from "@/types/career";
import type { LinkedInProfile } from "@/types/linkedin";

export function CustomPathForm({ profile, onAdded }: { profile: LinkedInProfile; onAdded: (custom: CareerOption) => Promise<void> }) {
  const [interest, setInterest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, interest }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(withTechnical(body, "Não foi possível gerar esse caminho."));
      await onAdded(body.custom as CareerOption);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha de conexão. Tente novamente.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
      <h3 className="font-semibold">Tem outro caminho em mente?</h3>
      <p className="mt-1 text-sm text-slate-600">Descreva em uma frase. Você pode gerar um caminho personalizado por pesquisa.</p>
      <label htmlFor="interest" className="sr-only">Caminho de interesse</label>
      <input
        id="interest"
        value={interest}
        onChange={(e) => setInterest(e.target.value)}
        maxLength={300}
        placeholder="Ex.: quero trabalhar com ciência de dados na área da saúde"
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button disabled={busy || interest.trim().length < 3} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "Gerando…" : "Gerar meu caminho"}
      </button>
    </form>
  );
}
