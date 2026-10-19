"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnalyzeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível gerar sua análise. Tente novamente.");
    } catch {
      setError("Falha de conexão. Tente novamente.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "Analisando seu perfil… (até 30 segundos)" : "Descobrir meus 5 caminhos"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
