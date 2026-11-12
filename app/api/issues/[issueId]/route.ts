import { NextResponse } from "next/server";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { issueTextSchema } from "@/lib/issues";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ issueId: string }>;
};

// Úprava problému, doplnenie postupu riešenia a zmena stavu – môže každý, kto pridáva záznamy.
export async function PATCH(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "ADD_LOGS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie upravovať problémy." }, { status: 403 });
  }

  try {
    const { issueId } = await context.params;
    const parsed = issueTextSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const existing = await prisma.projectIssue.findUnique({
      where: { id: issueId },
      select: { status: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Problém neexistuje." }, { status: 404 });
    }

    const becomesResolved = parsed.data.status === "RESOLVED" && existing.status !== "RESOLVED";
    const reopened = parsed.data.status === "OPEN";

    await prisma.projectIssue.update({
      where: { id: issueId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        resolution: parsed.data.resolution,
        status: parsed.data.status,
        ...(becomesResolved ? { resolvedAt: new Date(), resolvedById: permissionContext.userId } : {}),
        ...(reopened ? { resolvedAt: null, resolvedById: null } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Problém sa nepodarilo upraviť." }, { status: 500 });
  }
}

// Vymazať problém môže jeho autor alebo používateľ so správou všetkých záznamov.
export async function DELETE(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext) {
    return NextResponse.json({ message: "Najprv sa prihláste." }, { status: 401 });
  }

  try {
    const { issueId } = await context.params;
    const existing = await prisma.projectIssue.findUnique({
      where: { id: issueId },
      select: { createdById: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Problém neexistuje." }, { status: 404 });
    }

    const canDelete =
      hasSessionPermission(permissionContext, "MANAGE_ALL_LOGS") ||
      (existing.createdById !== null && existing.createdById === permissionContext.userId);
    if (!canDelete) {
      return NextResponse.json({ message: "Problém môže vymazať iba jeho autor alebo správca záznamov." }, { status: 403 });
    }

    await prisma.projectIssue.delete({ where: { id: issueId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Problém sa nepodarilo vymazať." }, { status: 500 });
  }
}
