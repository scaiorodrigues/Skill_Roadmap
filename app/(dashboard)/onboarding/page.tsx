import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingFlow } from "@/components/OnboardingFlow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("consented_at, full_name").eq("id", user.id).single();
  // linkedin_data é cifrado e não é legível pelo cliente; só checamos se existe.
  const { data: stored } = await createAdminClient().from("profiles").select("linkedin_data").eq("id", user.id).single();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <header>
        <h1 className="text-2xl font-bold">Olá{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!</h1>
        <p className="mt-1 text-slate-600">Vamos montar o seu GPS de carreira. Primeiro, o seu perfil.</p>
      </header>
      <OnboardingFlow consented={Boolean(profile?.consented_at)} imported={Boolean(stored?.linkedin_data)} />
    </main>
  );
}
