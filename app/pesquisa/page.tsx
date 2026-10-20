"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResearchView } from "@/components/ResearchView";

function Content() {
  const id = useSearchParams().get("id");
  return id ? <ResearchView id={id} /> : <p className="text-sm text-slate-700">Nenhuma pesquisa escolhida. <Link href="/historico" className="underline">Abrir o histórico</Link></p>;
}

export default function PesquisaPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <Link href="/historico" className="text-sm text-slate-500 underline">← Histórico</Link>
      <h1 className="text-2xl font-bold">Seus caminhos de carreira</h1>
      <Suspense fallback={<p className="text-sm text-slate-600">Carregando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
