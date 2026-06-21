"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ManexFooter } from "@/components/manex-footer";
import { ManexLogo } from "@/components/manex-logo";
import { getUserFacingError } from "@/lib/client-error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Prihlásenie zlyhalo.");
      }

      router.push("/");
      router.refresh();
    } catch (e) {
      setError(getUserFacingError(e, "Prihlásenie zlyhalo."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-red-300/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-slate-300/50 blur-3xl" />

        <section className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <ManexLogo />
            <p className="mt-2 text-sm text-gray-600">Prihlásenie do firemného systému</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 transition focus:ring"
                placeholder="admin@manex.sk"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Heslo
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 transition focus:ring"
                placeholder="••••••••"
              />
            </label>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Prihlasujem..." : "Prihlásiť"}
            </button>
          </form>
        </section>
      </main>

      <ManexFooter />
    </div>
  );
}
