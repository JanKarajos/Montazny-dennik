"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ManexFooter } from "@/components/manex-footer";
import { ManexLogo } from "@/components/manex-logo";
import { getUserFacingError } from "@/lib/client-error";

export default function ZmenaHeslaPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Nové heslo musí mať aspoň 8 znakov.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa zmeniť heslo.");
      }

      router.push("/");
      router.refresh();
    } catch (e) {
      setError(getUserFacingError(e, "Nepodarilo sa zmeniť heslo."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-red-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-slate-300/40 blur-3xl" />

        <section className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-2xl backdrop-blur">
          <div className="mb-5">
            <ManexLogo compact />
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-lg bg-slate-900 p-2 text-white">
                <KeyRound size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Povinná zmena hesla</h1>
                <p className="text-sm text-gray-600">Pred pokračovaním si nastavte nové heslo.</p>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Nové heslo
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                placeholder="Minimálne 8 znakov"
                required
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Potvrďte nové heslo
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                placeholder="Zadajte heslo ešte raz"
                required
              />
            </label>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? "Ukladám nové heslo..." : "Uložiť nové heslo"}
            </button>
          </form>
        </section>
      </main>

      <ManexFooter />
    </div>
  );
}
