"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getUserFacingError } from "@/lib/client-error";

type PersonItem = {
  id: string;
  name: string;
};

type Props = {
  persons: PersonItem[];
};

async function readMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  return payload.message ?? fallback;
}

export function PersonsClient({ persons }: Props) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!newName.trim()) {
      setError("Zadajte meno osoby.");
      return;
    }

    try {
      setAdding(true);
      const response = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error(await readMessage(response, "Osobu sa nepodarilo pridať."));
      }

      setNewName("");
      router.refresh();
    } catch (e) {
      setError(getUserFacingError(e, "Osobu sa nepodarilo pridať."));
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(person: PersonItem) {
    setError(null);

    try {
      setBusyId(person.id);
      const response = await fetch(`/api/persons/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });

      if (!response.ok) {
        throw new Error(await readMessage(response, "Osobu sa nepodarilo upraviť."));
      }

      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(getUserFacingError(e, "Osobu sa nepodarilo upraviť."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(person: PersonItem) {
    setError(null);

    if (!window.confirm(`Odstrániť osobu „${person.name}“ zo zoznamu?`)) {
      return;
    }

    try {
      setBusyId(person.id);
      const response = await fetch(`/api/persons/${person.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await readMessage(response, "Osobu sa nepodarilo odstrániť."));
      }

      router.refresh();
    } catch (e) {
      setError(getUserFacingError(e, "Osobu sa nepodarilo odstrániť."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Meno a priezvisko, napr. Ján Novák"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring sm:max-w-md"
        />
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          <Plus size={16} />
          {adding ? "Pridávam..." : "Pridať do zoznamu"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-700">
            <tr>
              <th className="px-3 py-2 font-semibold">Meno</th>
              <th className="px-3 py-2 text-right font-semibold">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((person, index) => (
              <tr key={person.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2 text-gray-800">
                  {editingId === person.id ? (
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleRename(person);
                        }
                      }}
                      autoFocus
                      className="w-full max-w-md rounded-md border border-gray-300 px-2 py-1 text-sm outline-none ring-red-500 focus:ring"
                    />
                  ) : (
                    person.name
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    {editingId === person.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleRename(person)}
                          disabled={busyId === person.id}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          <Check size={13} />
                          Uložiť
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          <X size={13} />
                          Zrušiť
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(person.id);
                            setEditingName(person.name);
                            setError(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          <Pencil size={13} />
                          Premenovať
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(person)}
                          disabled={busyId === person.id}
                          className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 size={13} />
                          Odstrániť
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {persons.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-gray-500">
                  Zoznam je zatiaľ prázdny.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
