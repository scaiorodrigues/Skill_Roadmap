"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseLinkedInZip } from "@/lib/parsers/linkedin";
import { extractPdfText, profileFromPdfText } from "@/lib/parsers/linkedin-pdf";
import type { LinkedInProfile } from "@/types/linkedin";

const isPdf = (b: Uint8Array) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b; // PK

export function LinkedInUpload() {
  const router = useRouter();
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    setError(null);
    setProfile(null);
    if (!file) return;
    setReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (isPdf(bytes)) {
        const { text, pages: n } = await extractPdfText(bytes);
        setProfile(profileFromPdfText(text));
        setPages(n);
      } else if (isZip(bytes)) {
        setProfile(parseLinkedInZip(bytes));
      } else {
        throw new Error("Formato não reconhecido. Envie o PDF do perfil ou o .zip exportado do LinkedIn.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    }
    setReading(false);
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
      <p className="mt-3 text-sm font-medium">Opção 1 · PDF do perfil (mais rápido)</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>Abra o seu perfil no LinkedIn e clique em <em>Mais</em> (ou <em>Recursos</em>).</li>
        <li>Escolha <em>Salvar em PDF</em> e envie o arquivo aqui.</li>
      </ol>
      <p className="mt-3 text-sm font-medium">Opção 2 · Exportação completa de dados (.zip)</p>
      <p className="mt-1 text-sm text-slate-700">
        <em>Configurações → Privacidade dos dados → Obter uma cópia dos seus dados</em>. Traz skills e certificações com datas.
      </p>
      <p className="mt-3 text-sm text-slate-600">
        A leitura acontece no seu navegador. Do PDF enviamos só o texto do perfil; do .zip, só os dados do perfil (nunca mensagens).
      </p>
      <label htmlFor="linkedin-file" className="sr-only">Arquivo do LinkedIn (PDF ou ZIP)</label>
      <input
        id="linkedin-file"
        type="file"
        accept=".pdf,.zip,application/pdf,application/zip"
        onChange={(e) => onFile(e.target.files?.[0])}
        className="mt-4 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white"
      />
      {reading && <p className="mt-3 text-sm text-slate-600">Lendo o arquivo…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {profile && (
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
          {profile.source === "pdf" ? (
            <>
              <p className="font-medium">PDF lido: {pages} {pages === 1 ? "página" : "páginas"}, {profile.rawText?.length.toLocaleString("pt-BR")} caracteres</p>
              <p className="mt-2 text-slate-500">Início do texto que será usado:</p>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-slate-700">
                {profile.rawText?.slice(0, 500)}
              </pre>
            </>
          ) : (
            <>
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
            </>
          )}
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
