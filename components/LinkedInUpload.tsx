"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseLinkedInZip } from "@/lib/parsers/linkedin";
import type { LinkedInProfile } from "@/types/linkedin";

export function LinkedInUpload() {
  const router = useRouter();
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    setError(null);
    setProfile(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Envie o arquivo .zip exportado do LinkedIn.");
      return;
    }
    try {
      setProfile(parseLinkedInZip(new Uint8Array(await file.arrayBuffer())));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    }
  }

  async function save() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/onboarding/linkedin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível salvar. Tente novamente.");
      setBusy(false);
    }
  }

  const years = profile ? Math.floor(profile.careerMonths / 12) : 0;
  const months = profile ? profile.careerMonths % 12 : 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Importe seu perfil do LinkedIn</h2>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>No LinkedIn, abra <em>Configurações → Privacidade dos dados → Obter uma cópia dos seus dados</em>.</li>
        <li>Peça o arquivo completo e baixe o .zip quando chegar por e-mail.</li>
        <li>Envie o .zip aqui. A leitura acontece no seu navegador: mensagens e outros dados <strong>não</strong> são enviados.</li>
      </ol>
      <input
        type="file"
        accept=".zip"
        onChange={(e) => onFile(e.target.files?.[0])}
        className="mt-5 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white"
      />
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {profile && (
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="font-medium">{profile.fullName || "Perfil lido"}</p>
          <p className="text-slate-600">{profile.headline}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <dt className="text-slate-500">Cargo atual</dt><dd>{profile.currentTitle || "—"}</dd>
            <dt className="text-slate-500">Experiências</dt><dd>{profile.positions.length}</dd>
            <dt className="text-slate-500">Skills</dt><dd>{profile.skills.length}</dd>
            <dt className="text-slate-500">Formações</dt><dd>{profile.education.length}</dd>
            <dt className="text-slate-500">Certificações</dt><dd>{profile.certifications.length}</dd>
            <dt className="text-slate-500">Tempo de carreira</dt><dd>{years} anos e {months} meses</dd>
          </dl>
          <button
            onClick={save}
            disabled={busy}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Salvando…" : "Confirmar e salvar"}
          </button>
        </div>
      )}
    </section>
  );
}
