import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { isUniqueConstraintError, prisma } from "@/lib/prisma";

const updateProjectSchema = z.object({
  projectNumber: z.string().min(1, "Číslo zákazky je povinné.").max(50),
  name: z.string().min(2, "Názov zákazky je povinný.").max(200),
});

const deleteProjectSchema = z.object({
  projectNumberConfirmation: z.string().min(1, "Zadajte číslo zákazky pre potvrdenie."),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "EDIT_PROJECT")) {
    return NextResponse.json({ message: "Nemáte oprávnenie upravovať zákazku." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const lockedProject = await prisma.project.findFirst({
      where: {
        id,
        completedAt: { not: null },
      },
      select: { id: true },
    });

    if (lockedProject) {
      return NextResponse.json({ message: "Zákazka je ukončená a uzamknutá." }, { status: 409 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        projectNumber: parsed.data.projectNumber.trim(),
        name: parsed.data.name.trim(),
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ message: "Zákazka s týmto číslom už existuje." }, { status: 409 });
    }
    return NextResponse.json({ message: "Nepodarilo sa uložiť zákazku." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "DELETE_PROJECT")) {
    return NextResponse.json({ message: "Nemáte oprávnenie mazať zákazky." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = deleteProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, projectNumber: true, completedAt: true },
    });

    if (!project) {
      return NextResponse.json({ message: "Zákazka neexistuje." }, { status: 404 });
    }

    if (project.projectNumber !== parsed.data.projectNumberConfirmation.trim()) {
      return NextResponse.json({ message: "Potvrdzovacie číslo zákazky sa nezhoduje." }, { status: 400 });
    }

    if (project.completedAt) {
      return NextResponse.json({ message: "Zákazka je ukončená a uzamknutá." }, { status: 409 });
    }

    await prisma.project.delete({ where: { id: project.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa vymazať zákazku." }, { status: 500 });
  }
}
