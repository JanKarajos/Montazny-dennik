"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserFacingError } from "@/lib/client-error";

type ProjectItem = {
  id: string;
  projectNumber: string;
  name: string;
  createdAt: string;
};

type Props = {
  projects: ProjectItem[];
  canCreateProject: boolean;
};

export function DashboardClient({ projects, canCreateProject }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [projectNumber, setProjectNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return projects;
    }

    return projects.filter((project) => {
      return (
        project.projectNumber.toLowerCase().includes(normalized) ||
        project.name.toLowerCase().includes(normalized)
      );
    });
  }, [projects, query]);

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!projectNumber.trim() || !projectName.trim()) {
      setError("Vyplňte číslo aj názov zákazky.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectNumber: projectNumber.trim(),
          name: projectName.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa vytvoriť zákazku.");
      }

      setProjectNumber("");
      setProjectName("");
      setOpenModal(false);
      router.refresh();
    } catch (e) {
      setError(getUserFacingError(e, "Nepodarilo sa vytvoriť zákazku."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hľadať podľa čísla alebo názvu zákazky"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-sm outline-none ring-red-500 transition focus:ring"
          />
        </div>

        {canCreateProject ? (
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus size={16} />
            Vytvoriť novú zákazku
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project) => (
          <Link
            href={`/projekty/${project.id}`}
            key={project.id}
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Zákazka</p>
            <p className="mt-1 line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-red-700">
              {project.projectNumber} - {project.name}
            </p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          Nenašli sa žiadne zákazky pre zadaný výraz.
        </div>
      ) : null}

      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:hidden">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Nová zákazka</h2>
            <p className="mt-1 text-sm text-gray-600">Vytvorte novú zákazku pre montážny tím.</p>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Číslo zákazky
                <input
                  value={projectNumber}
                  onChange={(e) => setProjectNumber(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  placeholder="Napr. ZA-2026-014"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Názov / klient
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  placeholder="Napr. Volkswagen - montáž linky"
                />
              </label>

              {error ? <p className="text-sm text-red-700">{error}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? "Ukladám..." : "Vytvoriť zákazku"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
