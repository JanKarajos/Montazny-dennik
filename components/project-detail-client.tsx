"use client";

import {
  Download,
  FileDown,
  LockOpen,
  Pencil,
  Printer,
  PlusCircle,
  Signature,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getUserFacingError } from "@/lib/client-error";

type LogRow = {
  id: string;
  authorId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  durationInMinutes: number;
  description: string;
  authorName: string;
};

type SignatureParty = "employee" | "customer";

type Props = {
  projectId: string;
  projectName: string;
  projectNumber: string;
  currentUserId: string;
  isLocked: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canAddLogs: boolean;
  canManageAllLogs: boolean;
  canUnlockProject: boolean;
  employeeSignature: string | null;
  employeeSignedAt: string | null;
  customerSignature: string | null;
  customerSignedAt: string | null;
  logs: LogRow[];
};

let robotoFontBase64Promise: Promise<string> | null = null;
let logoDataUrlPromise: Promise<string> | null = null;

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}

function formatDate(dateInput: string): string {
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Bratislava",
  });
  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  return `${day}.${month}.${year}`;
}

function formatTime(dateInput: string): string {
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Bratislava",
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function formatDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return `${formatDate(date.toISOString())} ${formatTime(date.toISOString())}`;
}

function formatSignedAtFull(dateInput: string | null): string {
  if (!dateInput) {
    return "Nepodpísané";
  }

  return `Podpísané dňa: ${formatDateTime(dateInput)}`;
}

function formatDateForInput(dateInput: string): string {
  return new Date(dateInput).toISOString().slice(0, 10);
}

function formatTimeForInput(dateInput: string): string {
  return new Date(dateInput).toLocaleTimeString("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Bratislava",
  });
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes("\n") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function canManageLog(log: LogRow, currentUserId: string, canManageAllLogs: boolean): boolean {
  if (canManageAllLogs) {
    return true;
  }

  return Boolean(log.authorId && log.authorId === currentUserId);
}

async function getRobotoFontBase64(): Promise<string> {
  if (!robotoFontBase64Promise) {
    robotoFontBase64Promise = fetch("/fonts/Roboto.ttf")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Nepodarilo sa načítať font pre PDF.");
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      });
  }

  return robotoFontBase64Promise;
}

async function getLogoDataUrl(): Promise<string> {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch("/logo-manex.png")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Nepodarilo sa načítať logo MANEX.");
        }

        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === "string") {
              resolve(result);
            } else {
              reject(new Error("Nepodarilo sa spracovať logo MANEX."));
            }
          };
          reader.onerror = () => reject(new Error("Nepodarilo sa spracovať logo MANEX."));
          reader.readAsDataURL(blob);
        });
      });
  }

  return logoDataUrlPromise;
}

export function ProjectDetailClient({
  projectId,
  projectName,
  projectNumber,
  currentUserId,
  isLocked,
  canEditProject,
  canDeleteProject,
  canAddLogs,
  canManageAllLogs,
  canUnlockProject,
  employeeSignature,
  employeeSignedAt,
  customerSignature,
  customerSignedAt,
  logs,
}: Props) {
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

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingLog, setEditingLog] = useState<LogRow | null>(null);
  const [logDate, setLogDate] = useState("");
  const [logStartTime, setLogStartTime] = useState("");
  const [logEndTime, setLogEndTime] = useState("");
  const [logDescription, setLogDescription] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  const [logEditError, setLogEditError] = useState<string | null>(null);

  const [deletingLog, setDeletingLog] = useState<LogRow | null>(null);
  const [deletingLogBusy, setDeletingLogBusy] = useState(false);
  const [logDeleteError, setLogDeleteError] = useState<string | null>(null);

  const [employeeSignatureValue, setEmployeeSignatureValue] = useState(employeeSignature);
  const [employeeSignedAtValue, setEmployeeSignedAtValue] = useState(employeeSignedAt);
  const [customerSignatureValue, setCustomerSignatureValue] = useState(customerSignature);
  const [customerSignedAtValue, setCustomerSignedAtValue] = useState(customerSignedAt);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const [signatureModalParty, setSignatureModalParty] = useState<SignatureParty | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockingProject, setUnlockingProject] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawnRef = useRef(false);

  const computedDuration = useMemo(() => {
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return formatDuration(minutes);
  }, [date, startTime, endTime]);

  useEffect(() => {
    if (!signatureModalParty || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.lineWidth = 2.2;

    isDrawingRef.current = false;
    lastPointRef.current = null;
    hasDrawnRef.current = false;
  }, [signatureModalParty]);

  useEffect(() => {
    setEmployeeSignatureValue(employeeSignature);
    setEmployeeSignedAtValue(employeeSignedAt);
    setCustomerSignatureValue(customerSignature);
    setCustomerSignedAtValue(customerSignedAt);
  }, [employeeSignature, employeeSignedAt, customerSignature, customerSignedAt]);

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handleSignaturePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const point = getCanvasPoint(event);
    if (!point) {
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSignaturePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getCanvasPoint(event);

    if (!context || !point || !lastPointRef.current) {
      return;
    }

    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    hasDrawnRef.current = true;
    lastPointRef.current = point;
  }

  function handleSignaturePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    isDrawingRef.current = false;
    lastPointRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function clearSignatureCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setSignatureError(null);
  }

  async function saveSignatureFromModal() {
    if (!signatureModalParty || !canvasRef.current) {
      return;
    }

    if (!hasDrawnRef.current) {
      setSignatureError("Najprv sa podpíšte do podpisového poľa.");
      return;
    }

    setSignatureError(null);

    try {
      setSavingSignature(true);
      const signatureData = canvasRef.current.toDataURL("image/png");
      const response = await fetch(`/api/projects/${projectId}/signatures`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party: signatureModalParty,
          signatureData,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        employeeSignature?: string | null;
        employeeSignedAt?: string | null;
        customerSignature?: string | null;
        customerSignedAt?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Podpis sa nepodarilo uložiť.");
      }

      if (signatureModalParty === "employee") {
        setEmployeeSignatureValue(payload.employeeSignature ?? null);
        setEmployeeSignedAtValue(payload.employeeSignedAt ?? null);
      } else {
        setCustomerSignatureValue(payload.customerSignature ?? null);
        setCustomerSignedAtValue(payload.customerSignedAt ?? null);
      }

      setSignatureModalParty(null);
      router.refresh();
    } catch (e) {
      setSignatureError(getUserFacingError(e, "Podpis sa nepodarilo uložiť."));
    } finally {
      setSavingSignature(false);
    }
  }

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
      setError(getUserFacingError(e, "Nepodarilo sa pridať záznam."));
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
      setEditError(getUserFacingError(e, "Nepodarilo sa upraviť zákazku."));
    } finally {
      setEditing(false);
    }
  }

  async function handleProjectDelete() {
    setDeleteError(null);

    if (deleteConfirmation.trim() !== projectNumber) {
      setDeleteError("Zadané číslo zákazky sa nezhoduje.");
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectNumberConfirmation: deleteConfirmation.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa vymazať zákazku.");
      }

      router.push("/");
      router.refresh();
    } catch (e) {
      setDeleteError(getUserFacingError(e, "Nepodarilo sa vymazať zákazku."));
    } finally {
      setDeleting(false);
    }
  }

  function openLogEdit(log: LogRow) {
    setEditingLog(log);
    setLogDate(formatDateForInput(log.date));
    setLogStartTime(formatTimeForInput(log.startTime));
    setLogEndTime(formatTimeForInput(log.endTime));
    setLogDescription(log.description);
    setLogEditError(null);
  }

  async function handleLogUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLogEditError(null);

    if (!editingLog) {
      return;
    }

    if (!logDescription.trim()) {
      setLogEditError("Popis práce je povinný.");
      return;
    }

    try {
      setSavingLog(true);
      const response = await fetch(`/api/logs/${editingLog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: logDate,
          startTime: logStartTime,
          endTime: logEndTime,
          description: logDescription.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa upraviť záznam práce.");
      }

      setEditingLog(null);
      router.refresh();
    } catch (e) {
      setLogEditError(getUserFacingError(e, "Nepodarilo sa upraviť záznam práce."));
    } finally {
      setSavingLog(false);
    }
  }

  async function handleLogDelete() {
    if (!deletingLog) {
      return;
    }

    setLogDeleteError(null);

    try {
      setDeletingLogBusy(true);
      const response = await fetch(`/api/logs/${deletingLog.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Nepodarilo sa vymazať záznam práce.");
      }

      setDeletingLog(null);
      router.refresh();
    } catch (e) {
      setLogDeleteError(getUserFacingError(e, "Nepodarilo sa vymazať záznam práce."));
    } finally {
      setDeletingLogBusy(false);
    }
  }

  async function handleExportPdf() {
    try {
      const [{ default: JsPdf }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      const fontBase64 = await getRobotoFontBase64();
      const logoDataUrl = await getLogoDataUrl();
      const reportDate = formatDateTime(new Date());
      const totalMinutes = logs.reduce((sum, log) => sum + log.durationInMinutes, 0);
      const totalHours = (totalMinutes / 60).toFixed(2);

      const doc = new JsPdf({ unit: "pt", format: "a4" });
      doc.addFileToVFS("Roboto.ttf", fontBase64);
      doc.addFont("Roboto.ttf", "Roboto", "normal");
      doc.setFont("Roboto", "normal");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFillColor(245, 246, 248);
      doc.rect(20, 20, pageWidth - 40, 124, "F");

      doc.addImage(logoDataUrl, "PNG", 30, 32, 88, 44);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.text("MANEX spol. s r.o.", 124, 46);
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9.5);
      doc.text("Krátka 21, 044 14 Čaňa, Slovenská republika", 124, 61);
      doc.text("tel.: +421 (55) 699 86 22", 124, 74);
      doc.text("E-mail: manex@manex.sk", 124, 87);
      doc.text("Web: www.manex.sk", 124, 100);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(19);
      doc.text("MONTÁŽNY PROTOKOL", pageWidth - 34, 48, { align: "right" });

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(10);
      doc.text(`Číslo zákazky: ${projectNumber}`, pageWidth - 34, 66, { align: "right" });
      doc.text(`Názov zákazky: ${projectName}`, pageWidth - 34, 80, { align: "right", maxWidth: 230 });
      doc.text(`Dátum a čas generovania: ${reportDate}`, pageWidth - 34, 108, { align: "right" });

      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(2);
      doc.line(20, 152, pageWidth - 20, 152);

      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(1);
      doc.line(20, 158, pageWidth - 20, 158);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text("Súhrn reportu", 24, 186);

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.text(`Počet riadkov: ${logs.length}`, 24, 206);
      doc.text(`Celkový počet hodín: ${totalHours} h`, 180, 206);

      autoTable(doc, {
        startY: 218,
        margin: { left: 24, right: 24, bottom: 170 },
        head: [["Dátum", "Pracovník", "Od - Do", "Trvanie", "Popis práce"]],
        body: logs.map((log) => [
          formatDate(log.date),
          log.authorName,
          `${formatTime(log.startTime)} - ${formatTime(log.endTime)}`,
          formatDuration(log.durationInMinutes),
          log.description,
        ]),
        styles: {
          font: "Roboto",
          fontSize: 9,
          textColor: [31, 41, 55],
          cellPadding: 6,
          lineColor: [203, 213, 225],
          lineWidth: 0.7,
        },
        headStyles: {
          fillColor: [31, 41, 55],
          textColor: [255, 255, 255],
          font: "Roboto",
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 100 },
          2: { cellWidth: 110 },
          3: { cellWidth: 70 },
        },
      });

      const signatureTop = pageHeight - 130;
      const signatureBlockWidth = (pageWidth - 60) / 2;

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(1);
      doc.rect(24, signatureTop, signatureBlockWidth, 88);
      doc.rect(36 + signatureBlockWidth, signatureTop, signatureBlockWidth, 88);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text("Podpis zamestnanca", 34, signatureTop + 16);
      doc.text("Podpis zákazníka", 46 + signatureBlockWidth, signatureTop + 16);

      if (employeeSignatureValue?.startsWith("data:image")) {
        doc.addImage(employeeSignatureValue, "PNG", 34, signatureTop + 22, signatureBlockWidth - 22, 36);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text("Nepodpísané", 34, signatureTop + 40);
      }

      if (customerSignatureValue?.startsWith("data:image")) {
        doc.addImage(customerSignatureValue, "PNG", 46 + signatureBlockWidth, signatureTop + 22, signatureBlockWidth - 22, 36);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text("Nepodpísané", 46 + signatureBlockWidth, signatureTop + 40);
      }

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8.7);
      doc.text(
        employeeSignedAtValue ? formatSignedAtFull(employeeSignedAtValue) : "Podpísané dňa: -",
        34,
        signatureTop + 74,
        { maxWidth: signatureBlockWidth - 16 },
      );
      doc.text(
        customerSignedAtValue ? formatSignedAtFull(customerSignedAtValue) : "Podpísané dňa: -",
        46 + signatureBlockWidth,
        signatureTop + 74,
        { maxWidth: signatureBlockWidth - 16 },
      );

      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFont("Roboto", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Strana ${page}/${totalPages}`, pageWidth - 24, pageHeight - 12, {
          align: "right",
        });
      }

      doc.save(`montazny-dennik-${projectNumber}.pdf`);
    } catch (e) {
      setError(getUserFacingError(e, "PDF report sa nepodarilo vygenerovať."));
    }
  }

  async function handleUnlockProject() {
    setUnlockError(null);

    try {
      setUnlockingProject(true);
      const response = await fetch(`/api/projects/${projectId}/signatures`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as {
        message?: string;
        employeeSignature?: string | null;
        employeeSignedAt?: string | null;
        customerSignature?: string | null;
        customerSignedAt?: string | null;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Nepodarilo sa odomknúť zákazku.");
      }

      // Aktualizujeme lokálny stav okamžite, aby sa podpisy hneď skryli aj bez ďalšej interakcie.
      setEmployeeSignatureValue(payload.employeeSignature ?? null);
      setEmployeeSignedAtValue(payload.employeeSignedAt ?? null);
      setCustomerSignatureValue(payload.customerSignature ?? null);
      setCustomerSignedAtValue(payload.customerSignedAt ?? null);

      setUnlockModalOpen(false);
      router.refresh();
    } catch (e) {
      setUnlockError(getUserFacingError(e, "Nepodarilo sa odomknúť zákazku."));
    } finally {
      setUnlockingProject(false);
    }
  }

  function handleExportCsv() {
    const metadataHeader = `MANEX spol. s r.o. - Montážny denník pre zákazku: ${projectNumber} - ${projectName}`;
    const metadataContact = "MANEX spol. s r.o. | Krátka 21, 044 14 Čaňa | tel.: +421 (55) 699 86 22 | manex@manex.sk | www.manex.sk";
    const metadataGeneratedAt = `Dátum a čas generovania: ${formatDateTime(new Date())}`;
    const header = ["Dátum", "Od", "Do", "Trvanie", "Popis práce", "Pracovník"];

    const rows = logs.map((log) => [
      formatDate(log.date),
      formatTime(log.startTime),
      formatTime(log.endTime),
      formatDuration(log.durationInMinutes),
      log.description,
      log.authorName,
    ]);

    const csvContent = [[metadataHeader], [metadataContact], [metadataGeneratedAt], [], header, ...rows]
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
          onClick={() => {
            void handleExportPdf();
          }}
          className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          <FileDown size={16} />
          Stiahnuť PDF report
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
        >
          <Printer size={16} />
          Tlačiť denník
        </button>
        {canDeleteProject ? (
          <button
            type="button"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteConfirmation("");
              setDeleteError(null);
            }}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            <Trash2 size={16} />
            Vymazať zákazku
          </button>
        ) : null}
      </div>

      {isLocked ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm print:hidden">
          <p className="text-sm font-medium text-amber-900">
            Zákazka je po podpise oboma stranami uzamknutá. Ďalšie záznamy práce už nie je možné pridávať ani upravovať.
          </p>
          {canUnlockProject ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setUnlockError(null);
                  setUnlockModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                <LockOpen size={16} />
                Odomknúť zákazku (Zmazať podpisy)
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {canAddLogs && !isLocked ? (
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
                <th className="px-3 py-2 font-semibold print:hidden">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const canManageThisLog = !isLocked && canManageLog(log, currentUserId, canManageAllLogs);

                return (
                  <tr key={log.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 text-gray-800">{formatDate(log.date)}</td>
                    <td className="px-3 py-2 text-gray-700">{formatTime(log.startTime)}</td>
                    <td className="px-3 py-2 text-gray-700">{formatTime(log.endTime)}</td>
                    <td className="px-3 py-2 font-semibold text-red-700">{formatDuration(log.durationInMinutes)}</td>
                    <td className="px-3 py-2 text-gray-800">{log.description}</td>
                    <td className="px-3 py-2 text-gray-700">{log.authorName}</td>
                    <td className="px-3 py-2 print:hidden">
                      {canManageThisLog ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openLogEdit(log)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            <Pencil size={13} />
                            Upraviť
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingLog(log);
                              setLogDeleteError(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                            Vymazať
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    Zatiaľ nie sú pridané žiadne záznamy.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Signature size={18} className="text-red-600" />
          Podpísať a uzatvoriť
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Podpis sa uloží do systému spolu s presným časom. Po podpise oboma stranami sa zákazka uzamkne.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <UserCheck size={16} className="text-red-600" />
              Podpis zamestnanca
            </h3>

            {employeeSignatureValue ? (
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                {employeeSignatureValue.startsWith("data:image") ? (
                  <img
                    src={employeeSignatureValue}
                    alt="Podpis zamestnanca"
                    className="h-20 w-full rounded border border-gray-300 bg-white object-contain p-1"
                  />
                ) : (
                  <p>Podpis: {employeeSignatureValue}</p>
                )}
                <p>{formatSignedAtFull(employeeSignedAtValue)}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSignatureModalParty("employee")}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Podpísať ako zamestnanec
              </button>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Signature size={16} className="text-red-600" />
              Podpis zákazníka
            </h3>

            {customerSignatureValue ? (
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                {customerSignatureValue.startsWith("data:image") ? (
                  <img
                    src={customerSignatureValue}
                    alt="Podpis zákazníka"
                    className="h-20 w-full rounded border border-gray-300 bg-white object-contain p-1"
                  />
                ) : (
                  <p>Podpis: {customerSignatureValue}</p>
                )}
                <p>{formatSignedAtFull(customerSignedAtValue)}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSignatureModalParty("customer")}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Podpísať ako zákazník
              </button>
            )}
          </div>
        </div>

        {signatureError ? <p className="mt-3 text-sm text-red-700">{signatureError}</p> : null}
      </section>

      {signatureModalParty ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              {signatureModalParty === "employee" ? "Podpis zamestnanca" : "Podpis zákazníka"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">Podpíšte sa do poľa nižšie.</p>

            <canvas
              ref={canvasRef}
              className="mt-3 h-56 w-full rounded-lg border border-gray-300 bg-white"
              style={{ touchAction: "none" }}
              onPointerDown={handleSignaturePointerDown}
              onPointerMove={handleSignaturePointerMove}
              onPointerUp={handleSignaturePointerUp}
              onPointerLeave={handleSignaturePointerUp}
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={clearSignatureCanvas}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Vymazať
              </button>
              <button
                type="button"
                onClick={() => setSignatureModalParty(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveSignatureFromModal();
                }}
                disabled={savingSignature}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {savingSignature ? "Ukladám podpis..." : "Uložiť podpis"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {unlockModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 print:hidden">
          <div className="w-full max-w-md rounded-xl border border-amber-300 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-amber-900">Odomknutie zákazky</h2>
            <p className="mt-2 text-sm text-gray-700">
              Naozaj chcete zmazať podpis zamestnanca aj zákazníka? Týmto sa zákazka odomkne.
            </p>

            {unlockError ? <p className="mt-3 text-sm text-red-700">{unlockError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlockModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleUnlockProject();
                }}
                disabled={unlockingProject}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {unlockingProject ? "Odomykám..." : "Odomknúť zákazku"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 print:hidden">
          <div className="w-full max-w-md rounded-xl border border-red-300 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-red-800">Vymazať zákazku</h2>
            <p className="mt-2 text-sm text-gray-700">
              Pre potvrdenie zadajte číslo zákazky <strong>{projectNumber}</strong>.
            </p>
            <p className="mt-2 text-xs text-gray-600">Vymazané budú aj všetky súvisiace záznamy práce.</p>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              Potvrdzovacie číslo zákazky
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                placeholder={projectNumber}
              />
            </label>

            {deleteError ? <p className="mt-3 text-sm text-red-700">{deleteError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={handleProjectDelete}
                disabled={deleting}
                className="rounded-md border border-red-300 bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Mažem..." : "Vymazať zákazku"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:hidden">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Upraviť záznam práce</h2>
            <p className="mt-1 text-sm text-gray-600">Zmeňte údaje záznamu práce.</p>

            <form onSubmit={handleLogUpdate} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Dátum
                <input
                  type="date"
                  value={logDate}
                  onChange={(event) => setLogDate(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Čas od
                <input
                  type="time"
                  value={logStartTime}
                  onChange={(event) => setLogStartTime(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Čas do
                <input
                  type="time"
                  value={logEndTime}
                  onChange={(event) => setLogEndTime(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  required
                />
              </label>

              <label className="sm:col-span-2 text-sm font-medium text-gray-700">
                Popis práce
                <textarea
                  value={logDescription}
                  onChange={(event) => setLogDescription(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-red-500 focus:ring"
                  required
                />
              </label>

              {logEditError ? <p className="sm:col-span-2 text-sm text-red-700">{logEditError}</p> : null}

              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={savingLog}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {savingLog ? "Ukladám..." : "Uložiť záznam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 print:hidden">
          <div className="w-full max-w-md rounded-xl border border-red-300 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-red-800">Vymazať záznam práce</h2>
            <p className="mt-2 text-sm text-gray-700">
              Naozaj chcete vymazať záznam zo dňa <strong>{formatDate(deletingLog.date)}</strong>?
            </p>

            {logDeleteError ? <p className="mt-3 text-sm text-red-700">{logDeleteError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingLog(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleLogDelete();
                }}
                disabled={deletingLogBusy}
                className="rounded-md border border-red-300 bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingLogBusy ? "Mažem..." : "Vymazať záznam"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
