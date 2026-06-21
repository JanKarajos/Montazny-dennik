import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { isValidTimeRange, parseDateAndTime } from "@/lib/time";

const updateLogSchema = z.object({
  date: z.string().min(1, "Dátum je povinný."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Neplatný čas od."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Neplatný čas do."),
  description: z.string().min(3, "Popis je príliš krátky.").max(2000),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function canManageLog(input: {
  sessionUserId: string;
  logUserId: string | null;
  hasManageAllLogs: boolean;
}): boolean {
  if (input.hasManageAllLogs) {
    return true;
  }

  return Boolean(input.logUserId && input.logUserId === input.sessionUserId);
}

export async function PATCH(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext) {
    return NextResponse.json({ message: "Najprv sa prihláste." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const parsed = updateLogSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const existing = await prisma.workLog.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        project: {
          select: {
            employeeSignedAt: true,
            customerSignedAt: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Záznam práce neexistuje." }, { status: 404 });
    }

    if (existing.project.employeeSignedAt && existing.project.customerSignedAt) {
      return NextResponse.json({ message: "Zákazka je po podpise uzamknutá." }, { status: 409 });
    }

    const hasManageAllLogs = hasSessionPermission(permissionContext, "MANAGE_ALL_LOGS");
    if (
      !canManageLog({
        sessionUserId: permissionContext.userId,
        logUserId: existing.userId,
        hasManageAllLogs,
      })
    ) {
      return NextResponse.json({ message: "Nemáte oprávnenie upraviť tento záznam." }, { status: 403 });
    }

    const start = parseDateAndTime(parsed.data.date, parsed.data.startTime);
    const end = parseDateAndTime(parsed.data.date, parsed.data.endTime);

    if (!isValidTimeRange(start, end)) {
      return NextResponse.json({ message: "Čas do musí byť po čase od." }, { status: 400 });
    }

    const durationInMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const dateOnly = new Date(`${parsed.data.date}T00:00:00`);

    const updated = await prisma.workLog.update({
      where: { id },
      data: {
        date: dateOnly,
        startTime: start,
        endTime: end,
        durationInMinutes,
        description: parsed.data.description.trim(),
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa upraviť záznam práce." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext) {
    return NextResponse.json({ message: "Najprv sa prihláste." }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    const existing = await prisma.workLog.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        project: {
          select: {
            employeeSignedAt: true,
            customerSignedAt: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Záznam práce neexistuje." }, { status: 404 });
    }

    if (existing.project.employeeSignedAt && existing.project.customerSignedAt) {
      return NextResponse.json({ message: "Zákazka je po podpise uzamknutá." }, { status: 409 });
    }

    const hasManageAllLogs = hasSessionPermission(permissionContext, "MANAGE_ALL_LOGS");
    if (
      !canManageLog({
        sessionUserId: permissionContext.userId,
        logUserId: existing.userId,
        hasManageAllLogs,
      })
    ) {
      return NextResponse.json({ message: "Nemáte oprávnenie vymazať tento záznam." }, { status: 403 });
    }

    await prisma.workLog.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa vymazať záznam práce." }, { status: 500 });
  }
}
