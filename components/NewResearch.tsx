"use client";

import { useState } from "react";
import { withTechnical } from "@/lib/format";
import { useRouter } from "next/navigation";
import { LinkedInUpload } from "@/components/LinkedInUpload";
import { ManualAiPanel } from "@/components/ManualAiPanel";
import { MANUAL_MODEL, buildManualOptionsPrompt, parseManualOptions } from "@/lib/manual-ai";
import { DISCLAIMER } from "@/lib/gemini/career-options";
import { requestPersistence, saveResearch } from "@/lib/storage/db";
import type { LinkedInProfile } from "@/types/linkedin";
import type { Research } from "@/types/research";
import type { AnalyzeResponse } from "@/app/api/analyze/route";

export function NewResearch() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(profile: LinkedInProfile, summary: AnalyzeResponse["summary"], result: AnalyzeResponse["result"]) {
    const now = new Date();
    const research: Research = {
      id: crypto.randomUUID(),
      createdAt: now.toISOString(),
      title: `${summary.currentRole || "Pesquisa"} · ${now.toLocaleDateString("pt-BR")}`,
      profile,
      summary,
      result,
    };
    await saveResearch(research);
    void requestPersistence();
    router.push(`/pesquisa?id=${research.id}`);
  }

  /** Resposta colada do Claude da própria pessoa: validada aqui, sem passar pelo servidor. */
  async function fromManual(profile: LinkedInProfile, pasted: string) {
    const { summary, options } = parseManualOptions(pasted);
    await save(profile, summary, { options, custom: null, disclaimer: DISCLAIMER, model: MANUAL_MODEL });
  }

  async function analyze(profile: LinkedInProfile) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(withTechnical(body, "Não foi possível gerar sua análise. Tente novamente."));

      const { summary, result } = body as AnalyzeResponse;
      await save(profile, summary, result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha de conexão. Tente novamente.");
      setBusy(false);
    }
  }

  return (
    <LinkedInUpload
      onConfirm={analyze}
      busy={busy}
      error={error}
      renderManual={(profile, close) => (
        <ManualAiPanel
          prompt={buildManualOptionsPrompt(profile)}
          onAnswer={(pasted) => fromManual(profile, pasted)}
          submitLabel="Ver meus caminhos"
          onCancel={close}
        />
      )}
    />
  );
}
