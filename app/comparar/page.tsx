"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CompareView } from "@/components/CompareView";

function Content() {
  const params = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  return a && b ? <CompareView a={a} b={b} /> : <p className="text-sm text-slate-700">Escolha duas pesquisas no <Link href="/historico" className="underline">histórico</Link>.</p>;
}

export default function CompararPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <Link href="/historico" className="text-sm text-slate-500 underline">← Histórico</Link>
      <h1 className="text-2xl font-bold">Comparação</h1>
      <Suspense fallback={<p className="text-sm text-slate-600">Carregando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
