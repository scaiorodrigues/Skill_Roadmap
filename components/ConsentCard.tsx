"use client";

import { useState } from "react";

export function ConsentCard({ onAccepted }: { onAccepted: () => void }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/consent", { method: "POST" });
    if (res.ok) onAccepted();
    else {
      setError("Não foi possível registrar o aceite. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Antes de começar: seus dados e a LGPD</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>Usamos o seu perfil do LinkedIn apenas para sugerir caminhos de carreira e montar o seu roadmap.</li>
        <li>O arquivo é lido no seu navegador: mensagens, contatos e outros dados que não usamos não são enviados.</li>
        <li>Os dados enviados ficam criptografados e só você os acessa.</li>
        <li>Para gerar as análises, trechos do seu perfil são enviados ao Google Gemini.</li>
        <li>Você pode exportar todos os seus dados ou apagar a sua conta a qualquer momento.</li>
      </ul>
      <label className="mt-4 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
        <span>Li e concordo com o tratamento dos meus dados nos termos acima.</span>
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        onClick={accept}
        disabled={!checked || loading}
        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Salvando…" : "Aceitar e continuar"}
      </button>
    </section>
  );
}
