import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold">Skill RoadMap</h1>
      <p className="mt-2 text-slate-600">
        Descubra os caminhos de carreira mais bem pagos para o seu perfil e acompanhe como eles mudam com o tempo.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/nova" className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm transition hover:bg-slate-800">
          <span className="block text-xl font-semibold">Nova pesquisa</span>
          <span className="mt-1 block text-sm text-slate-300">Envie o PDF do seu perfil do LinkedIn</span>
        </Link>
        <Link href="/historico" className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm transition hover:bg-slate-100">
          <span className="block text-xl font-semibold">Histórico</span>
          <span className="mt-1 block text-sm text-slate-600">Pesquisas e comparações anteriores</span>
        </Link>
      </div>
      <p className="mt-8 text-xs text-slate-500">
        Seu histórico fica guardado só neste aparelho; não há conta nem login. Para gerar a análise, o texto do seu perfil é enviado ao
        Google Gemini e não é armazenado por nós.
      </p>
    </main>
  );
}
