"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConsentCard() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/consent", { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      setError("Não foi possível registrar seu aceite. Tente novamente.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Antes de começar: seus dados</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
        <li>Usamos seu perfil do LinkedIn <strong>somente</strong> para gerar seus caminhos de carreira e o roadmap.</li>
        <li>Os dados do perfil são guardados <strong>criptografados</strong> e só você os acessa.</li>
        <li>Trechos do seu perfil são enviados à IA (Google Gemini) para a análise.</li>
        <li>Você pode exportar todos os seus dados ou apagar sua conta e tudo o que foi guardado, a qualquer momento (LGPD).</li>
      </ul>
      <label className="mt-5 flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>Li e concordo com o uso dos meus dados nos termos acima.</span>
      </label>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={confirm}
        disabled={!accepted || busy}
        className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Salvando…" : "Aceitar e continuar"}
      </button>
    </section>
  );
}
