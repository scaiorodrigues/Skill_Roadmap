import Link from "next/link";
import { HistoryClient } from "@/components/HistoryClient";

export default function HistoricoPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-10">
      <Link href="/" className="text-sm text-slate-500 underline">← Início</Link>
      <h1 className="text-2xl font-bold">Histórico</h1>
      <HistoryClient />
    </main>
  );
}
