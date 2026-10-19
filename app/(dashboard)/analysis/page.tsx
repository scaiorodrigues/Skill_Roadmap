import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { CareerCards } from "@/components/CareerCards";
import { CustomPathForm } from "@/components/CustomPathForm";
import { nextAnalysisMessage } from "@/lib/format";
import type { ProfileSummary, RoadmapOptions } from "@/types/career";

export default async function AnalysisPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: analysis } = await supabase
    .from("analyses")
    .select("raw_profile, roadmap_options, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: usage } = await supabase
    .from("analysis_usage")
    .select("next_available")
    .gt("next_available", new Date().toISOString())
    .order("next_available", { ascending: false })
    .limit(1)
    .maybeSingle();

  const summary = analysis?.raw_profile as ProfileSummary | null;
  const result = analysis?.roadmap_options as RoadmapOptions | null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <Link href="/onboarding" className="text-sm text-slate-500 underline">← Meu perfil</Link>
      <h1 className="text-2xl font-bold">Seus caminhos de carreira</h1>

      {!result ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-700">
            Vamos analisar seu perfil e mostrar os 5 caminhos mais bem remunerados para você. Você tem <strong>1 análise por mês</strong>;
            filtrar e reordenar os resultados depois é ilimitado.
          </p>
          {usage ? <p className="text-sm font-medium">{nextAnalysisMessage(usage.next_available)}</p> : <AnalyzeButton />}
        </section>
      ) : (
        <>
          {summary && (
            <section className="rounded-xl bg-slate-100 p-4 text-sm">
              <p><strong>{summary.currentRole}</strong> · {summary.seniority} · {summary.careerYears} anos de carreira</p>
              {summary.topSkills.length > 0 && <p className="mt-1 text-slate-600">Skills fortes: {summary.topSkills.join(", ")}</p>}
            </section>
          )}
          <p className="text-xs text-slate-500">{result.disclaimer}</p>
          <CareerCards options={result.options} custom={result.custom} />
          {!result.custom && <CustomPathForm />}
          {usage && <p className="text-sm text-slate-600">{nextAnalysisMessage(usage.next_available)}</p>}
        </>
      )}
    </main>
  );
}
