"use client";

import { useState } from "react";
import { getUserFacingError } from "@/lib/client-error";

type Props = {
  userName: string;
  userEmail: string;
};

export function MyProfileClient({ userName, userEmail }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setError("Nové heslo musí mať aspoň 8 znakov.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Nové heslá sa nezhodujú.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/user/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Nepodarilo sa zmeniť heslo.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccessMessage(payload.message ?? "Heslo bolo úspešne zmenené.");
    } catch (e) {
      setError(getUserFacingError(e, "Nepodarilo sa zmeniť heslo."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Môj profil</h1>
        <p className="text-sm text-gray-600">Správa osobných údajov a zmena vlastného hesla.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          <strong>Používateľ:</strong> {userName}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Email:</strong> {userEmail}
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Zmena vlastného hesla</h2>
        <p className="mt-1 text-sm text-gray-600">Pre zmenu hesla zadajte aktuálne heslo a nové heslo dvakrát.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Aktuálne heslo
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              required
            />
          </label>

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
            Potvrdenie nového hesla
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              required
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? "Ukladám zmenu..." : "Zmeniť heslo"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
