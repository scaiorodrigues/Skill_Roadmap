"use client";

import { useState } from "react";
import { MANUAL_ASSISTANT_URL } from "@/lib/manual-ai";

interface Props {
  /** Pedido pronto para levar ao Claude. */
  prompt: string;
  /** Recebe o texto colado; lança Error com mensagem amigável se não servir. */
  onAnswer: (pasted: string) => Promise<void>;
  submitLabel: string;
  onCancel: () => void;
}

/** Fluxo "copiar e colar": usa a conta do Claude da própria pessoa, sem passar pelo servidor do app. */
export function ManualAiPanel({ prompt, onAnswer, submitLabel, onCancel }: Props) {
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setError("Não consegui copiar sozinho. Selecione o texto do pedido abaixo e copie manualmente.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onAnswer(answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível usar essa resposta.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <p className="text-slate-600">
        Seu perfil vai para a sua conta do Claude, e não para o servidor do app. O resultado fica salvo só neste aparelho.
      </p>

      <h3 className="mt-4 font-semibold">1. Copie o pedido e cole no Claude</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white">
          {copied ? "Pedido copiado ✓" : "Copiar pedido"}
        </button>
        <a
          href={MANUAL_ASSISTANT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium"
        >
          Abrir o Claude ↗
        </a>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-slate-600">Ver o pedido</summary>
        <label htmlFor="manual-prompt" className="sr-only">Pedido para o Claude</label>
        <textarea
          id="manual-prompt"
          readOnly
          value={prompt}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-2 h-40 w-full rounded border border-slate-300 bg-slate-50 p-2 font-mono text-xs"
        />
      </details>

      <form onSubmit={submit}>
        <h3 className="mt-5 font-semibold">2. Cole aqui a resposta do Claude</h3>
        <p className="mt-1 text-slate-600">Use o botão de copiar que aparece embaixo da resposta dele.</p>
        <label htmlFor="manual-answer" className="sr-only">Resposta do Claude</label>
        <textarea
          id="manual-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder='{ "profileSummary": … }'
          className="mt-2 h-32 w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs"
        />
        {error && <p role="alert" className="mt-2 text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy || answer.trim().length < 20} className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50">
            {busy ? "Conferindo…" : submitLabel}
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-slate-600 underline">
            Voltar
          </button>
        </div>
      </form>
    </div>
  );
}
