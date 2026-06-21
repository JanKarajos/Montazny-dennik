import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { CORE_PERMISSION_CODES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isSystemRoleName } from "@/lib/system-roles";

const updateRoleSchema = z.object({
  name: z.string().min(2, "Názov role je povinný."),
  permissionCodes: z.array(z.enum(CORE_PERMISSION_CODES)).default([]),
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
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const role = await prisma.role.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!role) {
      return NextResponse.json({ message: "Rola neexistuje." }, { status: 404 });
    }

    if (isSystemRoleName(role.name)) {
      return NextResponse.json({ message: "Systémové roly nie je možné upravovať." }, { status: 400 });
    }

    const roleName = parsed.data.name.trim();

    const existingByName = await prisma.role.findUnique({
      where: { name: roleName },
      select: { id: true },
    });

    if (existingByName && existingByName.id !== id) {
      return NextResponse.json({ message: "Rola s týmto názvom už existuje." }, { status: 409 });
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { in: parsed.data.permissionCodes } },
      select: { id: true, code: true },
    });

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: roleName,
        permissions: {
          set: permissions.map((permission) => ({ id: permission.id })),
        },
      },
      select: {
        id: true,
        name: true,
        permissions: {
          select: { code: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      isSystem: isSystemRoleName(updated.name),
      permissions: updated.permissions.map((permission) => permission.code),
    });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa upraviť rolu." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "MANAGE_USERS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const role = await prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return NextResponse.json({ message: "Rola neexistuje." }, { status: 404 });
    }

    if (isSystemRoleName(role.name)) {
      return NextResponse.json({ message: "Systémové roly nie je možné vymazať." }, { status: 400 });
    }

    if (role._count.users > 0) {
      return NextResponse.json(
        { message: "Rolu nie je možné vymazať, kým je priradená používateľom." },
        { status: 409 },
      );
    }

    await prisma.role.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa vymazať rolu." }, { status: 500 });
  }
}
