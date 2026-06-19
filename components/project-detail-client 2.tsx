"use client";

import { Download, Pencil, Printer, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type LogRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationInMinutes: number;
  description: string;
  authorName: string;
};

type Props = {
  projectId: string;
  projectName: string;
  projectNumber: string;
  canEditProject: boolean;
  canAddLogs: boolean;
  logs: LogRow[];
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hod`;
  return `${m} min`;
}

function formatDate(dateInput: string): string {
  return new Date(dateInput).toLocaleDateString("sk-SK");
}

function formatTime(dateInput: string): string {
  return new Date(dateInput).toLocaleTimeString("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes("\n") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function ProjectDetailClient({ projectId, projectName, projectNumber, canEditProject, canAddLogs, logs }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("15:00");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editProjectNumber, setEditProjectNumber] = useState(projectNumber);
  const [editProjectName, setEditProjectName] = useState(projectName);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const computedDuration = useMemo(() => {
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return formatDuration(minutes);
  }, [date, startTime, endTime]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Popis práce je povinný.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/worklogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          date,
          startTime,
          endTime,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa pridať záznam.");
      }

      setDescription("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepodarilo sa pridať záznam.");
    } finally {
      setSaving(false);
    }
  }

  async function handleProjectUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);

    if (!editProjectNumber.trim() || !editProjectName.trim()) {
      setEditError("Vyplňte číslo aj názov zákazky.");
      return;
    }

    try {
      setEditing(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectNumber: editProjectNumber.trim(),
          name: editProjectName.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa upraviť zákazku.");
      }

      setEditOpen(false);
      router.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Nepodarilo sa upraviť zákazku.");
    } finally {
      setEditing(false);
    }
  }

  function handleExportCsv() {
    const header = ["Dátum", "Od", "Do", "Trvanie", "Popis práce", "Pracovník"];

    const rows = logs.map((log) => [
      formatDate(log.date),
      formatTime(log.startTime),
      formatTime(log.endTime),
      formatDuration(log.durationInMinutes),
      log.description,
      log.authorName,
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(";"))
      .join("\n");

    const csvWithBom = `\uFEFF${csvContent}`;
    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `montazny-dennik-${projectNumber}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Zákazka</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {projectNumber} - {projectName}
          </h1>
        </div>

        {canEditProject ? (
          <button
            type="button"
            onClick={() => {
              setEditProjectNumber(projectNumber);
              setEditProjectName(projectName);
              setEditError(null);
              setEditOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <Pencil size={16} />
            Upraviť zákazku
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
        >
          <Download size={16} />
          Exportovať do Excelu (CSV)
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
        >
          <Printer size={16} />
          Tlačiť denník
        </button>
      </div>

      {canAddLogs ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <PlusCircle size={18} className="text-red-600" />
          Pridať záznam
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Dátum
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              required
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Čas od
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              required
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Čas do
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              required
            />
          </label>

          <div className="text-sm font-medium text-gray-700">
            Vypočítané trvanie
            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-800">
              {computedDuration ?? "Skontrolujte časový rozsah"}
            </div>
          </div>

          <label className="sm:col-span-2 text-sm font-medium text-gray-700">
            Popis práce
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
              placeholder="Popíšte vykonanú prácu"
              required
            />
          </label>

          {error ? <p className="sm:col-span-2 text-sm text-red-700">{error}</p> : null}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? "Ukladám..." : "Pridať záznam"}
            </button>
          </div>
        </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm print:shadow-none print:border-0">
        <div className="border-b border-gray-200 bg-slate-900 px-4 py-3 text-white print:bg-white print:text-black">
          <h2 className="text-lg font-bold">Denník prác</h2>
          <p className="text-sm text-gray-200 print:text-gray-700">
            {projectNumber} - {projectName}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Dátum</th>
                <th className="px-3 py-2 font-semibold">Od</th>
                <th className="px-3 py-2 font-semibold">Do</th>
                <th className="px-3 py-2 font-semibold">Trvanie</th>
                <th className="px-3 py-2 font-semibold">Popis práce</th>
                <th className="px-3 py-2 font-semibold">Vytvoril</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={log.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2 text-gray-800">{formatDate(log.date)}</td>
                  <td className="px-3 py-2 text-gray-700">{formatTime(log.startTime)}</td>
                  <td className="px-3 py-2 text-gray-700">{formatTime(log.endTime)}</td>
                  <td className="px-3 py-2 font-semibold text-red-700">{formatDuration(log.durationInMinutes)}</td>
                  <td className="px-3 py-2 text-gray-800">{log.description}</td>
                  <td className="px-3 py-2 text-gray-700">{log.authorName}</td>
                </tr>
              ))}

              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    Zatiaľ nie sú pridané žiadne záznamy.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:hidden">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Upraviť zákazku</h2>
            <p className="mt-1 text-sm text-gray-600">Zmeňte číslo alebo názov zákazky.</p>

            <form onSubmit={handleProjectUpdate} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Číslo zákazky
                <input
                  value={editProjectNumber}
                  onChange={(event) => setEditProjectNumber(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  placeholder="Napr. 334"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Názov zákazky
                <input
                  value={editProjectName}
                  onChange={(event) => setEditProjectName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  placeholder="Napr. Montáž linky A"
                />
              </label>

              {editError ? <p className="text-sm text-red-700">{editError}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {editing ? "Ukladám..." : "Uložiť zmeny"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
