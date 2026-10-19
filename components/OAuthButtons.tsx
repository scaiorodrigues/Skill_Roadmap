"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

const LABELS: Record<Provider, string> = {
  google: "Continuar com Google",
  github: "Continuar com GitHub",
};

export function OAuthButtons() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setLoading(provider);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Não foi possível iniciar o login. Tente novamente.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {(Object.keys(LABELS) as Provider[]).map((p) => (
        <button
          key={p}
          onClick={() => signIn(p)}
          disabled={loading !== null}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
        >
          {loading === p ? "Redirecionando…" : LABELS[p]}
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
