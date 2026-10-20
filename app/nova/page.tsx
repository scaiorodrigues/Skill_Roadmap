import Link from "next/link";
import { NewResearch } from "@/components/NewResearch";

export default function NovaPesquisaPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-10">
      <Link href="/" className="text-sm text-slate-500 underline">← Início</Link>
      <h1 className="text-2xl font-bold">Nova pesquisa</h1>
      <NewResearch />
    </main>
  );
}
