export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">JustClickMe</h1>
      <p className="text-lg text-gray-600 mb-8">Ecosystem dashboard — Cloudflare Tunnel ready</p>
      <div className="grid gap-4 w-full max-w-xl">
        <a
          href="/api/health"
          className="block rounded-lg bg-blue-600 px-6 py-3 text-white text-center hover:bg-blue-700 transition"
        >
          Check API Health
        </a>
        <a
          href="/api/admin/stats"
          className="block rounded-lg bg-gray-800 px-6 py-3 text-white text-center hover:bg-gray-900 transition"
        >
          Admin Stats
        </a>
      </div>
    </main>
  );
}
