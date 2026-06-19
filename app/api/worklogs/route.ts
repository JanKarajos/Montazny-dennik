import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { isValidTimeRange, parseDateAndTime } from "@/lib/time";

const workLogSchema = z.object({
  projectId: z.string().min(1),
  date: z.string().min(1, "Dátum je povinný."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Neplatný čas od."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Neplatný čas do."),
  description: z.string().min(3, "Popis je príliš krátky.").max(2000),
});

export async function POST(request: Request) {
  const context = await getSessionPermissionContext();
  if (!context) {
    return NextResponse.json({ message: "Najprv sa prihláste." }, { status: 401 });
  }

  if (!hasSessionPermission(context, "ADD_LOGS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie pridávať záznamy." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = workLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const start = parseDateAndTime(parsed.data.date, parsed.data.startTime);
    const end = parseDateAndTime(parsed.data.date, parsed.data.endTime);

    if (!isValidTimeRange(start, end)) {
      return NextResponse.json({ message: "Čas do musí byť po čase od." }, { status: 400 });
    }

    const durationInMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    const dateOnly = new Date(`${parsed.data.date}T00:00:00`);

    const workLog = await prisma.workLog.create({
      data: {
        projectId: parsed.data.projectId,
        userId: context.userId,
        description: parsed.data.description.trim(),
        date: dateOnly,
        startTime: start,
        endTime: end,
        durationInMinutes,
      },
    });

    return NextResponse.json(workLog, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa uložiť záznam." }, { status: 500 });
  }
}
