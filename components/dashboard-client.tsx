"use client";

import { Plus, Search, Trash2 } from "lucide-react";
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
  canDeleteProject: boolean;
};

export function DashboardClient({ projects, canCreateProject, canDeleteProject }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [projectNumber, setProjectNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteProject, setDeleteProject] = useState<ProjectItem | null>(null);
  const [deleteProjectConfirmation, setDeleteProjectConfirmation] = useState("");
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDeleteProject() {
    if (!deleteProject) {
      return;
    }

    setDeleteError(null);

    if (deleteProjectConfirmation.trim() !== deleteProject.projectNumber) {
      setDeleteError("Zadané číslo zákazky sa nezhoduje.");
      return;
    }

    try {
      setDeletingProject(true);
      const response = await fetch(`/api/projects/${deleteProject.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectNumberConfirmation: deleteProjectConfirmation.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa vymazať zákazku.");
      }

      setDeleteProject(null);
      setDeleteProjectConfirmation("");
      router.refresh();
    } catch (e) {
      setDeleteError(getUserFacingError(e, "Nepodarilo sa vymazať zákazku."));
    } finally {
      setDeletingProject(false);
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
          <article
            key={project.id}
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow"
          >
            <Link href={`/projekty/${project.id}`}>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Zákazka</p>
              <p className="mt-1 line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-red-700">
                {project.projectNumber} - {project.name}
              </p>
            </Link>

            {canDeleteProject ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteProject(project);
                    setDeleteProjectConfirmation("");
                    setDeleteError(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <Trash2 size={13} />
                  Vymazať zákazku
                </button>
              </div>
            ) : null}
          </article>
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

      {deleteProject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 print:hidden">
          <div className="w-full max-w-md rounded-xl border border-red-300 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-red-800">Vymazať zákazku</h2>
            <p className="mt-2 text-sm text-gray-700">
              Pre potvrdenie zadajte číslo zákazky <strong>{deleteProject.projectNumber}</strong>.
            </p>
            <p className="mt-2 text-xs text-gray-600">Vymazané budú aj všetky súvisiace záznamy práce.</p>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              Potvrdzovacie číslo zákazky
              <input
                value={deleteProjectConfirmation}
                onChange={(event) => setDeleteProjectConfirmation(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                placeholder={deleteProject.projectNumber}
              />
            </label>

            {deleteError ? <p className="mt-3 text-sm text-red-700">{deleteError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteProject(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deletingProject}
                className="rounded-md border border-red-300 bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingProject ? "Mažem..." : "Vymazať zákazku"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
