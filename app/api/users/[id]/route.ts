import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

const updateUserSchema = z.object({
  name: z.string().min(2, "Meno je povinné."),
  email: z.string().email("Neplatný email."),
  permissionCodes: z.array(z.string()).default([]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "MANAGE_USERS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();

    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingByEmail && existingByEmail.id !== id) {
      return NextResponse.json({ message: "Používateľ s týmto emailom už existuje." }, { status: 409 });
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { in: parsed.data.permissionCodes } },
      select: { id: true, code: true },
    });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        email: normalizedEmail,
        permissions: {
          set: permissions.map((permission) => ({ id: permission.id })),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: {
          select: { id: true, name: true },
        },
        permissions: {
          select: { code: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      roleId: updated.roleId,
      roleName: updated.role?.name ?? "Bez role",
      permissions: updated.permissions.map((permission) => permission.code),
    });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa upraviť používateľa." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "MANAGE_USERS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    if (permissionContext.userId === id) {
      return NextResponse.json({ message: "Nemôžete vymazať vlastný účet." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa vymazať používateľa." }, { status: 500 });
  }
}
