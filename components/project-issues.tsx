"use client";

import { AlertTriangle, Camera, CheckCircle2, ImagePlus, Pencil, RotateCcw, Trash2, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getUserFacingError } from "@/lib/client-error";
import { preparePhoto } from "@/lib/resize-image";

export type IssuePhotoKindCode = "PROBLEM" | "RESOLUTION";
export type IssueStatusCode = "OPEN" | "RESOLVED";

export type IssuePhotoRow = {
  id: string;
  kind: IssuePhotoKindCode;
  uploadedById: string | null;
};

export type IssueRow = {
  id: string;
  title: string;
  description: string;
  resolution: string | null;
  status: IssueStatusCode;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  resolvedByName: string | null;
  resolvedAt: string | null;
  photos: IssuePhotoRow[];
};

type Props = {
  projectId: string;
  issues: IssueRow[];
  currentUserId: string;
  canAddIssues: boolean;
  canManageAllIssues: boolean;
};

type EditorState = {
  issueId: string | null;
  title: string;
  description: string;
  resolved: boolean;
  resolution: string;
};

function formatDateTime(dateInput: string): string {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bratislava",
  })
    .format(new Date(dateInput))
    .replace(/\s(?=\d{4})/, "");
}

async function readMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  return payload.message ?? fallback;
}

export function ProjectIssues({ projectId, issues, currentUserId, canAddIssues, canManageAllIssues }: Props) {
  const router = useRouter();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [problemFiles, setProblemFiles] = useState<File[]>([]);
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const [viewerPhotoId, setViewerPhotoId] = useState<string | null>(null);
  const [deletingIssue, setDeletingIssue] = useState<IssueRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const sortedIssues = [...issues].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "OPEN" ? -1 : 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const openCount = issues.filter((issue) => issue.status === "OPEN").length;

  function canDeleteIssue(issue: IssueRow): boolean {
    return canManageAllIssues || (issue.createdById !== null && issue.createdById === currentUserId);
  }

  function canDeletePhoto(issue: IssueRow, photo: IssuePhotoRow): boolean {
    return canDeleteIssue(issue) || (photo.uploadedById !== null && photo.uploadedById === currentUserId);
  }

  function openEditor(issue: IssueRow | null, markResolved = false) {
    setEditor(
      issue
        ? {
            issueId: issue.id,
            title: issue.title,
            description: issue.description,
            resolved: markResolved || issue.status === "RESOLVED",
            resolution: issue.resolution ?? "",
          }
        : { issueId: null, title: "", description: "", resolved: false, resolution: "" },
    );
    setProblemFiles([]);
    setResolutionFiles([]);
    setEditorError(null);
    setProgress(null);
  }

  async function uploadPhotos(
    issueId: string,
    files: File[],
    kind: IssuePhotoKindCode,
    offset: number,
    total: number,
    markUploaded: () => void,
  ) {
    for (const [index, file] of files.entries()) {
      setProgress(`Nahrávam fotky ${offset + index + 1}/${total}...`);
      const prepared = await preparePhoto(file);
      const formData = new FormData();
      formData.append("file", prepared.file, prepared.fileName);
      if (prepared.thumbnail) {
        formData.append("thumbnail", prepared.thumbnail, `nahlad-${prepared.fileName}`);
      }
      formData.append("kind", kind);

      const response = await fetch(`/api/issues/${issueId}/photos`, { method: "POST", body: formData });
      if (!response.ok) {
        throw new Error(await readMessage(response, `Fotku „${file.name}“ sa nepodarilo nahrať.`));
      }
      // Nahratú fotku odstránime z výberu, aby sa pri opakovanom uložení nenahrala znova.
      markUploaded();
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) {
      return;
    }

    setEditorError(null);
    if (editor.title.trim().length < 3) {
      setEditorError("Zadajte krátky názov problému.");
      return;
    }
    if (editor.description.trim().length < 3) {
      setEditorError("Popíšte, v čom je problém.");
      return;
    }

    let issueId = editor.issueId;
    try {
      setSaving(true);
      setProgress("Ukladám...");
      const body = JSON.stringify({
        title: editor.title,
        description: editor.description,
        resolution: editor.resolved ? editor.resolution : editor.resolution || undefined,
        status: editor.resolved ? "RESOLVED" : "OPEN",
      });

      const response = await fetch(issueId ? `/api/issues/${issueId}` : `/api/projects/${projectId}/issues`, {
        method: issueId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Problém sa nepodarilo uložiť."));
      }
      if (!issueId) {
        issueId = ((await response.json()) as { id: string }).id;
        // Ak by nahrávanie fotiek zlyhalo, ďalšie uloženie už upraví vytvorený problém.
        setEditor((current) => (current ? { ...current, issueId } : current));
      }

      const total = problemFiles.length + (editor.resolved ? resolutionFiles.length : 0);
      await uploadPhotos(issueId, problemFiles, "PROBLEM", 0, total, () =>
        setProblemFiles((current) => current.slice(1)),
      );
      if (editor.resolved) {
        await uploadPhotos(issueId, resolutionFiles, "RESOLUTION", problemFiles.length, total, () =>
          setResolutionFiles((current) => current.slice(1)),
        );
      }

      setEditor(null);
      router.refresh();
    } catch (e) {
      setEditorError(getUserFacingError(e, "Problém sa nepodarilo uložiť."));
      router.refresh();
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  async function handleReopen(issue: IssueRow) {
    setListError(null);
    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issue.title,
          description: issue.description,
          resolution: issue.resolution ?? undefined,
          status: "OPEN",
        }),
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Problém sa nepodarilo znovu otvoriť."));
      }
      router.refresh();
    } catch (e) {
      setListError(getUserFacingError(e, "Problém sa nepodarilo znovu otvoriť."));
    }
  }

  async function handleDeleteIssue() {
    if (!deletingIssue) {
      return;
    }
    setListError(null);
    try {
      setDeleteBusy(true);
      const response = await fetch(`/api/issues/${deletingIssue.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Problém sa nepodarilo vymazať."));
      }
      setDeletingIssue(null);
      router.refresh();
    } catch (e) {
      setListError(getUserFacingError(e, "Problém sa nepodarilo vymazať."));
      setDeletingIssue(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!window.confirm("Vymazať túto fotku?")) {
      return;
    }
    setListError(null);
    try {
      const response = await fetch(`/api/issue-photos/${photoId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await readMessage(response, "Fotku sa nepodarilo vymazať."));
      }
      router.refresh();
    } catch (e) {
      setListError(getUserFacingError(e, "Fotku sa nepodarilo vymazať."));
    }
  }

  function renderPhotos(issue: IssueRow, kind: IssuePhotoKindCode) {
    const photos = issue.photos.filter((photo) => photo.kind === kind);
    if (photos.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {photos.map((photo) => (
          <div key={photo.id} className="relative">
            <button
              type="button"
              onClick={() => setViewerPhotoId(photo.id)}
              className="block aspect-square w-full overflow-hidden rounded-md border border-gray-200 bg-gray-100"
              aria-label="Zobraziť fotku"
            >
              <img
                src={`/api/issue-photos/${photo.id}?thumb=1`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
            {canAddIssues && canDeletePhoto(issue, photo) ? (
              <button
                type="button"
                onClick={() => void handleDeletePhoto(photo.id)}
                aria-label="Vymazať fotku"
                className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-700 shadow hover:bg-white print:hidden"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  function renderFilePicker(label: string, files: File[], setFiles: (files: File[]) => void) {
    return (
      <div className="space-y-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100">
          <Camera size={18} />
          Odfotiť alebo vybrať fotky
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              setFiles([...files, ...selected]);
              event.target.value = "";
            }}
          />
        </label>
        {files.length > 0 ? (
          <ul className="flex flex-wrap gap-1 text-xs text-gray-700">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1">
                <ImagePlus size={12} />
                <span className="max-w-[10rem] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  aria-label={`Odobrať ${file.name}`}
                  className="text-gray-500 hover:text-red-700"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <AlertTriangle size={18} className="text-red-600 print:hidden" />
          Problémy na zákazke
          {issues.length > 0 ? (
            <span className="text-sm font-normal text-gray-500">
              ({openCount > 0 ? `${openCount} otvorené, ` : ""}
              {issues.length} spolu)
            </span>
          ) : null}
        </h2>
        {canAddIssues ? (
          <button
            type="button"
            onClick={() => openEditor(null)}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 print:hidden"
          >
            <AlertTriangle size={16} />
            Nahlásiť problém
          </button>
        ) : null}
      </div>

      {listError ? <p className="mt-2 text-sm text-red-700">{listError}</p> : null}

      {sortedIssues.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">Na zákazke zatiaľ nie sú zaznamenané žiadne problémy.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sortedIssues.map((issue) => {
            const resolved = issue.status === "RESOLVED";
            return (
              <li
                key={issue.id}
                className={`break-inside-avoid rounded-lg border p-3 ${
                  resolved ? "border-gray-200 bg-white" : "border-red-200 bg-red-50/40"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words font-bold text-slate-900">{issue.title}</h3>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      resolved ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {resolved ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {resolved ? "Vyriešený" : "Otvorený"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Nahlásil {issue.createdByName ?? "bývalý zamestnanec"}, {formatDateTime(issue.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-line break-words text-sm text-gray-800">{issue.description}</p>
                {renderPhotos(issue, "PROBLEM")}

                {issue.resolution || issue.photos.some((photo) => photo.kind === "RESOLUTION") || resolved ? (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <p className="flex items-center gap-1 text-sm font-semibold text-emerald-900">
                      <Wrench size={14} />
                      Postup riešenia
                    </p>
                    {issue.resolution ? (
                      <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-800">{issue.resolution}</p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">Postup riešenia nebol popísaný.</p>
                    )}
                    {renderPhotos(issue, "RESOLUTION")}
                    {resolved && issue.resolvedAt ? (
                      <p className="mt-2 text-xs text-emerald-800">
                        Vyriešil {issue.resolvedByName ?? "bývalý zamestnanec"}, {formatDateTime(issue.resolvedAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {canAddIssues ? (
                  <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                    {!resolved ? (
                      <button
                        type="button"
                        onClick={() => openEditor(issue, true)}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                      >
                        <CheckCircle2 size={13} />
                        Vyriešiť
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleReopen(issue)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        <RotateCcw size={13} />
                        Znovu otvoriť
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditor(issue)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      <Pencil size={13} />
                      Upraviť / pridať fotky
                    </button>
                    {canDeleteIssue(issue) ? (
                      <button
                        type="button"
                        onClick={() => setDeletingIssue(issue)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                        Vymazať
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editor ? (
        <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/60 p-4 print:hidden">
          <div className="my-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">{editor.issueId ? "Upraviť problém" : "Nahlásiť problém"}</h2>
            <p className="mt-1 text-sm text-gray-600">
              Popíšte chybu a pridajte fotky. Postup riešenia môžete doplniť hneď alebo neskôr.
            </p>

            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Názov problému
                <input
                  value={editor.title}
                  onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                  placeholder="Napr. Netesný spoj na prívode vzduchu"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Popis chyby
                <textarea
                  value={editor.description}
                  onChange={(event) => setEditor({ ...editor, description: event.target.value })}
                  rows={4}
                  placeholder="Čo sa stalo, kde, za akých okolností…"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                />
              </label>

              {renderFilePicker("Fotky problému", problemFiles, setProblemFiles)}

              <label className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                <input
                  type="checkbox"
                  checked={editor.resolved}
                  onChange={(event) => setEditor({ ...editor, resolved: event.target.checked })}
                  className="h-4 w-4 accent-emerald-600"
                />
                Problém je vyriešený
              </label>

              {editor.resolved ? (
                <>
                  <label className="block text-sm font-medium text-gray-700">
                    Postup riešenia
                    <textarea
                      value={editor.resolution}
                      onChange={(event) => setEditor({ ...editor, resolution: event.target.value })}
                      rows={4}
                      placeholder="Ako sa problém vyriešil, čo sa vymenilo, nastavilo…"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                    />
                  </label>
                  {renderFilePicker("Fotky z riešenia", resolutionFiles, setResolutionFiles)}
                </>
              ) : null}

              {progress ? <p className="text-sm text-gray-600">{progress}</p> : null}
              {editorError ? <p className="text-sm text-red-700">{editorError}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  disabled={saving}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? "Ukladám..." : "Uložiť"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingIssue ? (
        <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/70 p-4 print:hidden">
          <div className="my-auto w-full max-w-md rounded-xl border border-red-300 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-red-800">Vymazať problém</h2>
            <p className="mt-2 text-sm text-gray-700">
              Naozaj chcete vymazať problém <strong>{deletingIssue.title}</strong> aj so všetkými fotkami?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingIssue(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteIssue()}
                disabled={deleteBusy}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteBusy ? "Mažem..." : "Vymazať"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewerPhotoId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 print:hidden"
          onClick={() => setViewerPhotoId(null)}
        >
          <img
            src={`/api/issue-photos/${viewerPhotoId}`}
            alt="Fotka problému"
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => setViewerPhotoId(null)}
            aria-label="Zavrieť"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-900 shadow"
          >
            <X size={20} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
