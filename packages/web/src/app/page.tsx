import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
          JustClickMe
        </h1>
        <p className="text-lg text-slate-300">
          Hybrid smart-contract + PostgreSQL matrix ecosystem. Activate your ID, build your 3×3 global matrix, fill your 40-user personal pool, and earn.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition font-semibold shadow-lg"
          >
            Dashboard
          </Link>
          <Link
            href="/matrix"
            className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition font-semibold shadow-lg"
          >
            Matrix
          </Link>
        </div>
      </div>
    </main>
  );
}
