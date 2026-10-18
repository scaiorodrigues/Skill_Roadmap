import { OAuthButtons } from "@/components/OAuthButtons";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-bold">Skill RoadMap</h1>
      <p className="mt-2 mb-8 text-slate-600">
        Seu GPS de carreira: descubra os caminhos mais rentáveis para o seu perfil e siga um roadmap completo.
      </p>
      {searchParams.error && (
        <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          Falha na autenticação. Tente novamente.
        </p>
      )}
      <OAuthButtons />
      <p className="mt-6 text-xs text-slate-500">
        Sem senha e sem cadastro manual. Por FromTech · código aberto (MIT).
      </p>
    </main>
  );
}
