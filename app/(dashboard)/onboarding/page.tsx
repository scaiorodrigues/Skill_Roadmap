import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConsentCard } from "@/components/ConsentCard";
import { LinkedInUpload } from "@/components/LinkedInUpload";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("consented_at").eq("id", user.id).single();
  // linkedin_data é cifrado e fora do alcance do cliente; só checamos se existe.
  const { data: stored } = await createAdminClient().from("profiles").select("linkedin_data").eq("id", user.id).single();
  const imported = Boolean(stored?.linkedin_data);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-bold">Skill RoadMap</h1>
      {!profile?.consented_at ? (
        <ConsentCard />
      ) : imported ? (
        <section className="rounded-xl border border-green-200 bg-green-50 p-6">
          <h2 className="text-xl font-semibold">Perfil importado</h2>
          <p className="mt-2 text-sm text-slate-700">
            Seu perfil do LinkedIn está salvo com segurança. Em breve: seus 5 caminhos de carreira mais rentáveis.
          </p>
        </section>
      ) : (
        <LinkedInUpload />
      )}
    </main>
  );
}
