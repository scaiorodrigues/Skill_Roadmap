"use client";

import { useState } from "react";
import { parseLinkedInZip } from "@/lib/parsers/linkedin";
import type { LinkedInProfile } from "@/types/linkedin";

function formatCareer(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} ano${y > 1 ? "s" : ""}` : "", m ? `${m} mes${m > 1 ? "es" : ""}` : ""].filter(Boolean).join(" e ") || "—";
}

export function LinkedInUpload({ alreadyImported }: { alreadyImported: boolean }) {
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(alreadyImported);

  async function onFile(file: File | undefined) {
    setError(null);
    setProfile(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) return setError("Envie o arquivo .zip exportado do LinkedIn.");
    if (file.size > 200 * 1024 * 1024) return setError("Arquivo grande demais.");
    try {
      setProfile(parseLinkedInZip(new Uint8Array(await file.arrayBuffer())));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui ler esse arquivo.");
    }
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/onboarding/linkedin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setProfile(null);
    } else {
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Erro ao salvar.");
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Importe seu perfil do LinkedIn</h2>
      <p className="mt-1 text-sm text-slate-600">
        No LinkedIn: Configurações → Privacidade de dados → Obter uma cópia dos seus dados. Baixe o <b>.zip</b> e envie aqui.
      </p>
      {saved && !profile && (
        <p className="mt-3 rounded bg-green-50 p-3 text-sm text-green-800">
          Perfil importado e salvo. Você pode enviar um novo arquivo para atualizar.
        </p>
      )}
      <input
        type="file"
        accept=".zip,application/zip"
        onChange={(e) => onFile(e.target.files?.[0])}
        className="mt-4 block w-full text-sm"
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {profile && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="font-medium">O que vamos salvar:</p>
          <ul className="mt-2 space-y-1 text-slate-700">
            <li>Nome: {profile.fullName || "—"}</li>
            <li>Cargo atual: {profile.currentTitle || "—"}{profile.currentCompany ? ` · ${profile.currentCompany}` : ""}</li>
            <li>Tempo de carreira: {formatCareer(profile.careerMonths)}</li>
            <li>{profile.positions.length} experiências · {profile.skills.length} skills · {profile.education.length} formações · {profile.certifications.length} certificações</li>
          </ul>
          <button
            onClick={save}
            disabled={saving}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Confirmar e salvar"}
          </button>
        </div>
      )}
    </section>
  );
}
